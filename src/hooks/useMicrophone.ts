"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ANALYSIS_WINDOW } from "@/lib/pitch";

/**
 * Getting samples out of the phone and into `detectPitch`, and giving them back
 * the moment the tuner is not being used.
 *
 * **The lifecycle here is `useWakeLock`'s problem, one degree more serious.**
 * Read that file first — this is the same shape. A wake lock left on is a
 * battery complaint nobody will ever attribute to this app. A microphone left on
 * is the browser showing a recording indicator over an app the reader thought
 * they had closed, which is a privacy complaint and is right to be one. So every
 * track is stopped on pause, on the page going hidden, and on unmount — and
 * leaving the route unmounts this, which is the third of those for free.
 *
 * **Nothing here re-opens the stream by itself.** Coming back to a visible tab
 * leaves the tuner idle and waiting to be pressed, even though the permission is
 * by then granted and `getUserMedia` would succeed silently. Re-taking a
 * microphone because a reader switched back to a tab is exactly the behaviour
 * the indicator exists to warn people about.
 */

/**
 * The constraints, and the reason all three of them are here.
 *
 * **`getUserMedia`'s audio defaults are tuned for speech on a call, and all
 * three of them destroy a sustained musical tone.** This is one line and it is
 * the line somebody will tidy away on the grounds that the defaults are
 * sensible; they are, for a voice call:
 *
 * - `noiseSuppression` treats a decaying string as noise, because that is what a
 *   decaying sound *is* to a speech model, and fades it out under the detector.
 * - `autoGainControl` rides the level, so the RMS gate in `detectPitch` can no
 *   longer tell a room from an instrument — a silent room gets amplified until
 *   it looks like a signal.
 * - `echoCancellation` subtracts what it believes is feedback, and a steady tone
 *   is exactly what that filter is shaped to remove.
 *
 * A tuner built without this works well enough on a loud pluck at a desk and
 * fails on a real instrument in a real room, which is the worst way for it to
 * fail: the only thing that would find it is `M10 · 6`.
 */
export const MIC_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
};

export type MicrophoneStatus =
  /** No `getUserMedia` at all. A screen that explains itself, not a throw. */
  | "unsupported"
  /** Nothing is being listened to, and nothing has gone wrong. */
  | "idle"
  /** The prompt is up, or the stream is opening. */
  | "starting"
  | "listening"
  /**
   * Asked and not answered — the reader closed the prompt. Pressing again will
   * ask again, so the screen offers exactly that.
   */
  | "dismissed"
  /**
   * The browser holds a standing no and will not ask again. **This is the state
   * that needs its own copy**: without it the button sits there doing nothing
   * for ever, and the reader has no way to know the app is not the thing
   * refusing.
   */
  | "denied"
  /** There is permission but no usable stream — no microphone, or it is busy. */
  | "failed";

export interface Microphone {
  status: MicrophoneStatus;
  /** Must be called from a user gesture: it is what the prompt needs. */
  start: () => void;
  stop: () => void;
  /**
   * Fill `into` with the newest `ANALYSIS_WINDOW` samples. `false` when there is
   * nothing listening, which is the caller's cue to stop asking.
   *
   * The buffer type is spelt out because `getFloatTimeDomainData` refuses a
   * `Float32Array` over a `SharedArrayBuffer`, and a bare `Float32Array` is
   * exactly that union since TypeScript 5.7.
   */
  read: (into: Float32Array<ArrayBuffer>) => boolean;
  /** The stream's real rate — 48000 on most phones, 44100 on some. */
  sampleRate: number | null;
}

interface Session {
  stream: MediaStream;
  context: AudioContext;
  source: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
}

function supported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    (typeof AudioContext !== "undefined" ||
      typeof (window as { webkitAudioContext?: unknown }).webkitAudioContext !==
        "undefined")
  );
}

/**
 * Denied or merely dismissed.
 *
 * Both arrive as `NotAllowedError`, and the difference matters to the reader: a
 * dismissed prompt comes back if they press again, a denied one never does. The
 * Permissions API is the only thing that knows which, and Safari does not
 * implement it for `microphone` — so where it cannot be asked this reports the
 * sticky one, because *press again and nothing happens* is the failure worth
 * explaining and the button is still there for anyone who only dismissed it.
 */
async function classifyRefusal(): Promise<"denied" | "dismissed"> {
  try {
    const status = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    return status.state === "denied" ? "denied" : "dismissed";
  } catch {
    return "denied";
  }
}

export function useMicrophone(): Microphone {
  const [status, setStatus] = useState<MicrophoneStatus>("idle");
  const [sampleRate, setSampleRate] = useState<number | null>(null);
  const sessionRef = useRef<Session | null>(null);
  /**
   * Set by `stop()` and by unmount, read by the async parts of `start()`.
   *
   * A reader who presses start and leaves before the prompt is answered would
   * otherwise be handed a live microphone by a component that no longer exists,
   * with nothing left to stop it. This is the flag that closes that window, and
   * it is the same one `useWakeLock` keeps for the same reason.
   */
  const abandonedRef = useRef(false);

  const teardown = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) return;

    // The tracks first and unconditionally. Everything else here is tidying;
    // this is the line that turns the recording indicator off.
    for (const track of session.stream.getTracks()) track.stop();
    try {
      session.source.disconnect();
    } catch {
      // Already torn down by a context that closed under us.
    }
    void session.context.close().catch(() => {});
  }, []);

  useEffect(() => {
    if (!supported()) setStatus("unsupported");
  }, []);

  const stop = useCallback(() => {
    abandonedRef.current = true;
    teardown();
    setSampleRate(null);
    setStatus((current) =>
      current === "listening" || current === "starting" ? "idle" : current,
    );
  }, [teardown]);

  const start = useCallback(() => {
    if (!supported()) {
      setStatus("unsupported");
      return;
    }
    if (sessionRef.current !== null) return;

    abandonedRef.current = false;
    setStatus("starting");

    void (async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: MIC_CONSTRAINTS,
          video: false,
        });
      } catch (error) {
        const name = error instanceof Error ? error.name : "";
        if (name === "NotAllowedError" || name === "SecurityError") {
          setStatus(await classifyRefusal());
        } else {
          // NotFoundError, NotReadableError, OverconstrainedError: there is
          // permission and no usable microphone. A phone without one is a screen
          // that explains itself.
          setStatus("failed");
        }
        return;
      }

      // The prompt can outlive the screen. If it did, the reader is somewhere
      // else and this stream must not survive the answer.
      if (abandonedRef.current) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }

      try {
        const Ctor =
          typeof AudioContext !== "undefined"
            ? AudioContext
            : (window as unknown as { webkitAudioContext: typeof AudioContext })
                .webkitAudioContext;
        const context = new Ctor();
        // iOS hands back a suspended context even from inside a gesture.
        if (context.state === "suspended") await context.resume();

        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = ANALYSIS_WINDOW;
        source.connect(analyser);
        // Deliberately not connected to context.destination: routing the
        // microphone to the speakers is a feedback loop, and the analyser pulls
        // frames without needing a destination.

        if (abandonedRef.current) {
          for (const track of stream.getTracks()) track.stop();
          void context.close().catch(() => {});
          return;
        }

        sessionRef.current = { stream, context, source, analyser };
        setSampleRate(context.sampleRate);
        setStatus("listening");
      } catch {
        for (const track of stream.getTracks()) track.stop();
        setStatus("failed");
      }
    })();
  }, []);

  const read = useCallback((into: Float32Array<ArrayBuffer>): boolean => {
    const session = sessionRef.current;
    if (!session) return false;
    session.analyser.getFloatTimeDomainData(into);
    return true;
  }, []);

  /**
   * Hidden means nobody is tuning, and a microphone held over a backgrounded app
   * is the complaint this hook exists to avoid. It is released rather than
   * suspended, and it does not come back by itself — see the note at the top.
   */
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [stop]);

  // Unmount covers leaving the route, which is the common way out of the tuner.
  useEffect(() => {
    return () => {
      abandonedRef.current = true;
      teardown();
    };
  }, [teardown]);

  return { status, start, stop, read, sampleRate };
}
