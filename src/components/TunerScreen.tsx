"use client";

/**
 * The screen a reader points at their ukulele.
 *
 * The detector is `src/lib/pitch.ts` and the stream is `useMicrophone`; what is
 * here is everything between a frequency and a person: which string that
 * frequency is nearest, how far off it is, which way to turn the peg, and what
 * to say when there is no permission, no microphone, or nothing but a quiet
 * room.
 *
 * **The smoothing lives here rather than in the detector, and that is on
 * purpose.** `detectPitch` answers about one window of samples and is right
 * about it; a needle that is right forty times a second is still a needle nobody
 * can tune to, because a plucked string's pitch bends as it decays and its
 * partials fade at different rates. So the reading shown is the median of the
 * last few, which is the change `M10 · 6`'s first outcome would come back to
 * widen — a consumer of the detector, not the detector.
 */

import { useEffect, useRef, useState } from "react";
import { useInstrument } from "@/contexts/InstrumentContext";
import { useMicrophone } from "@/hooks/useMicrophone";
import { useWakeLock } from "@/hooks/useWakeLock";
import { readTuningId, writeTuningId } from "@/lib/instrument";
import {
  ANALYSIS_WINDOW,
  detectPitch,
  IN_TUNE_CENTS,
  nearestTarget,
} from "@/lib/pitch";
import {
  namesMatchSongbook,
  songbookShiftSemitones,
  type TuningId,
  transposeNoteName,
  tuningById,
} from "@/lib/tunings";

/**
 * How often the detector runs, in ms.
 *
 * One detection is about 1.4 ms of arithmetic, so running it on every animation
 * frame would spend a tenth of the phone's frame budget on a number that cannot
 * usefully change that fast. At 45 ms the needle answers a pluck immediately and
 * the median below still spans a fifth of a second.
 */
const DETECT_INTERVAL_MS = 45;

/** How many readings the median is taken over. See the note at the top. */
const SMOOTHING_WINDOW = 5;

/**
 * How long a gap counts as a new pluck rather than a pause in the same one, in ms.
 *
 * Crossing it throws the median's history away, so the next note is not averaged
 * with one that stopped sounding a minute ago.
 *
 * **It does not clear the reading, and it used to.** The first version wiped the
 * meter back to *Esperando una cuerda…* here, on the argument that a note left
 * standing in a quiet room is a tuner appearing to hear something it is not.
 * That argument is right about a note it never heard and wrong about the note it
 * just did: a ukulele string decays in a couple of seconds, so it turned the
 * meter off at exactly the moment the reader looks up from the peg to see how
 * they did. Iker found it on a real instrument in `M10 · 6`. The reading now
 * stays until another note is played or the microphone is stopped — and it is
 * marked held, which is how the original argument is honoured rather than
 * ignored: what must not happen is a *stale* reading passing for a live one.
 */
const NEW_PLUCK_GAP_MS = 900;

/**
 * Far enough apart to be a different string rather than a wobble, in cents.
 *
 * Crossing it throws the median's history away, so moving from one string to the
 * next jumps rather than crawling through the notes in between.
 */
const NEW_STRING_CENTS = 250;

/** How far either side of the target the needle can travel, in cents. */
const METER_RANGE_CENTS = 50;

interface Reading {
  stringIndex: number;
  /** Negative is flat, positive is sharp. */
  cents: number;
}

/** "4.ª cuerda" … "1.ª cuerda", from the array position. */
function stringLabel(index: number): string {
  return `${4 - index}.ª cuerda`;
}

function formatHz(frequency: number): string {
  return `${frequency.toFixed(2).replace(".", ",")} Hz`;
}

export function TunerScreen() {
  // **The tuner offers this instrument's tunings and no others** (`M15 · 4`).
  // A flat list would put a cuatro tuning under a ukulele, and it would print
  // two entries nobody can tell apart: the ukulele's `En Re — La Re Fa♯ Si` and
  // the cuatro's *cambur pintón* differ only in the octave of the 1st string.
  const { instrument } = useInstrument();
  const [tuningId, setTuningId] = useState<TuningId>(instrument.reference.id);
  const [reading, setReading] = useState<Reading | null>(null);
  /** The note on screen stopped sounding — see `NEW_PLUCK_GAP_MS`. */
  const [held, setHeld] = useState(false);
  const { status, start, stop, read, sampleRate } = useMicrophone();

  // Read on mount and not in the initial state: this component is prerendered,
  // and seeding from localStorage would make the first client render disagree
  // with the markup it is hydrating. AutoScrollBar does the same for the pace.
  //
  // It re-runs when the instrument changes, which is the whole reason the
  // stored tuning is per instrument: a toggle has to land on a tuning that is
  // in the list on screen, and it lands on the one that instrument was last
  // left in rather than on its reference.
  useEffect(() => {
    setTuningId(readTuningId(instrument));
  }, [instrument]);

  const tuning = tuningById(instrument.tunings, tuningId);
  const strings = tuning.strings;

  // `strings` is the identity React re-runs the loop on, and it is stable for as
  // long as the tuning is: the tuning tables are module constants.
  const stringsRef = useRef(strings);
  stringsRef.current = strings;

  const listening = status === "listening";

  // The same lock the song sheet takes, and the case for it is stronger here.
  // A phone dims in about thirty seconds and four strings take longer than that,
  // so the screen goes dark in the middle of tuning — and unlike a reader
  // playing from the sheet, someone tuning has both hands on the instrument and
  // one of them on a peg, so tapping the phone awake costs them the string they
  // were on. Found on a real ukulele in `M10 · 6`. It is released the moment the
  // microphone is, which `useMicrophone` already does on pause, on hidden and on
  // unmount.
  useWakeLock(listening);

  useEffect(() => {
    if (!listening || sampleRate === null) {
      // Stopping is the reader saying they are done. A note held from before is
      // no longer an answer to anything, so this is where it goes.
      setReading(null);
      setHeld(false);
      return;
    }

    const buffer = new Float32Array(ANALYSIS_WINDOW);
    const recent: number[] = [];
    let frame = 0;
    let lastRun = 0;
    let lastHeard = 0;

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (now - lastRun < DETECT_INTERVAL_MS) return;
      lastRun = now;

      if (!read(buffer)) return;
      const frequency = detectPitch(buffer, sampleRate);

      if (frequency === null) {
        if (lastHeard !== 0 && now - lastHeard > NEW_PLUCK_GAP_MS) {
          recent.length = 0;
          lastHeard = 0;
          // The reading stays. Only the median's history goes, so the next
          // pluck starts clean rather than being averaged with this one.
          setHeld(true);
        }
        return;
      }

      // A jump this big is the reader moving to another string, not the note
      // wobbling. Keeping the old readings would walk the needle through every
      // note in between.
      if (
        recent.length > 0 &&
        Math.abs(1200 * Math.log2(frequency / recent[recent.length - 1])) >
          NEW_STRING_CENTS
      ) {
        recent.length = 0;
      }

      recent.push(frequency);
      if (recent.length > SMOOTHING_WINDOW) recent.shift();
      lastHeard = now;

      const sorted = [...recent].sort((a, b) => a - b);
      const median = sorted[sorted.length >> 1];

      const match = nearestTarget(median, stringsRef.current);
      if (match === null) return;

      setHeld(false);
      setReading({
        stringIndex: stringsRef.current.indexOf(match.target),
        cents: match.cents,
      });
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [listening, sampleRate, read]);

  const handleTuningChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = tuningById(instrument.tunings, event.target.value).id;
    setTuningId(next);
    writeTuningId(instrument, next);
    setReading(null);
    setHeld(false);
  };

  /**
   * The figure on screen, and **the figure the verdict is judged on** — BUG-015.
   *
   * Rounding once is the whole fix. Judging the raw reading while displaying a
   * rounded one let the meter show `−5 cents` and say `Baja` on a screen whose
   * own rule is that ±5 is in tune, because anything from 5.0 to 5.5 cents flat
   * rounds down to five and fails the test. The number a reader sees and the
   * word under it have to be answers to the same question.
   *
   * The needle keeps the raw value below: it is a position, not a claim, and one
   * that snapped to whole cents would be worse.
   */
  const shownCents = reading === null ? 0 : Math.round(reading.cents);

  const state =
    reading === null
      ? "waiting"
      : Math.abs(shownCents) <= IN_TUNE_CENTS
        ? "in-tune"
        : shownCents < 0
          ? "flat"
          : "sharp";

  const target = reading === null ? null : strings[reading.stringIndex];
  const needleCents =
    reading === null
      ? 0
      : Math.max(
          -METER_RANGE_CENTS,
          Math.min(METER_RANGE_CENTS, reading.cents),
        );

  const verdict =
    state === "in-tune" ? "Afinada" : state === "flat" ? "Baja" : "Alta";
  const advice =
    state === "flat"
      ? "Tensar la cuerda"
      : state === "sharp"
        ? "Aflojar la cuerda"
        : "Lista";

  // The caveat, built out of the derived shift so the chord it names cannot be
  // wrong, and measured against **this instrument's** reference tuning rather
  // than against standard ukulele — otherwise the cuatro reports +2 against its
  // own only tuning and the caveat fires on the one tuning it must never fire
  // on. Shown for D and baritone; standard and low-G share every shape *and*
  // every name, which is what makes them the exempt pair. In cuatro mode it is
  // structurally unreachable, because *cambur pintón* is the reference and the
  // cuatro has no second tuning (`M15 · 4`) — the diagrams have moved to meet
  // the names, which is the whole of M15.
  const shift = songbookShiftSemitones(tuning, instrument.reference);

  return (
    <div className="uv-tuner">
      <p className="uv-eyebrow">El Ukulele Veneco</p>
      <h1 className="uv-song-title">Afinador</h1>
      <p className="uv-tuner__lede">
        El micrófono escucha la cuerda, dice qué nota es y cuánto le falta. Nada
        se graba y nada sale del teléfono: el sonido se mide aquí mismo y se
        descarta.
      </p>

      <div className="uv-tuner__tuning">
        <label className="uv-tuner__tuning-label" htmlFor="uv-tuning">
          Afinación
        </label>
        {/* Native, per DECISIONS.md 17 read the other way: the filters were
            hand-built because a <select> was specifically inadequate at 181
            options, and nothing about one is inadequate at four — or, on the
            cuatro, at one. It stays a select at one option rather than becoming
            a line of text: the control is where a reader looks to find out what
            the tuner is listening for, and it disappearing would read as the
            app having lost the setting rather than as the instrument having one
            tuning. */}
        <select
          id="uv-tuning"
          className="uv-select"
          value={tuningId}
          onChange={handleTuningChange}
        >
          {instrument.tunings.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {namesMatchSongbook(tuning, instrument.reference) ? null : (
        <p className="uv-tuner__caveat">
          El cancionero está escrito para la afinación estándar. Las formas de
          los acordes siguen sirviendo en esta afinación, pero los nombres no:
          lo que el cancionero llama{" "}
          <strong>{transposeNoteName("C", 0)}</strong> aquí suena{" "}
          <strong>{transposeNoteName("C", shift)}</strong>.
        </p>
      )}

      {/* `data-held` dims the block a little when the note has stopped
          sounding. The reading stays — that is the point of it — but a held one
          must not pass for a live one, which is the honest half of the argument
          that used to clear it outright. */}
      <div
        className="uv-tuner__meter"
        data-state={state}
        data-held={reading !== null && held}
      >
        {listening ? (
          reading !== null && target !== null ? (
            <>
              <div className="uv-tuner__note-block">
                <div className="uv-tuner__note">
                  {target.name}
                  <span className="uv-tuner__octave">{target.octave}</span>
                </div>
                <div className="uv-tuner__string">
                  {stringLabel(reading.stringIndex)} ·{" "}
                  {formatHz(target.frequency)}
                </div>
              </div>

              <div className="uv-tuner__track">
                <div className="uv-tuner__rail" />
                <div className="uv-tuner__centre" />
                <div
                  className="uv-tuner__needle"
                  style={{ left: `${50 + needleCents}%` }}
                />
              </div>

              <div className="uv-tuner__cents">
                {shownCents >= 0 ? "+" : "−"}
                {Math.abs(shownCents)}
                <span className="uv-tuner__unit">cents</span>
              </div>
              <div className="uv-tuner__verdict">{verdict}</div>
              <div className="uv-tuner__advice">{advice}</div>
            </>
          ) : (
            // A silent room between plucks is the normal case, not an error.
            <p className="uv-tuner__waiting">Esperando una cuerda…</p>
          )
        ) : (
          <p className="uv-tuner__waiting">
            {status === "starting"
              ? "Pidiendo el micrófono…"
              : "El afinador está apagado"}
          </p>
        )}
      </div>

      {/* One coarse sentence for assistive tech, and only this. The numbers
          above change more than twenty times a second, which read out loud is
          not a tuner but a barrier; this changes only when the note or the
          verdict does, so it is announced when something has happened. */}
      <p className="uv-sr-only" aria-live="polite">
        {listening && reading !== null && target !== null
          ? `${target.name}${target.octave}, ${verdict.toLowerCase()}`
          : ""}
      </p>

      <div className="uv-tuner__action">
        <button
          type="button"
          className={`uv-btn ${listening ? "uv-btn--secondary" : "uv-btn--primary"} uv-btn--lg`}
          onClick={listening ? stop : start}
          disabled={status === "unsupported" || status === "starting"}
        >
          <span>{listening ? "Detener" : "Escuchar"}</span>
        </button>
      </div>

      {status === "denied" ? (
        <p className="uv-tuner__notice">
          El navegador tiene bloqueado el micrófono para este sitio, y la app no
          puede volver a pedirlo: el permiso se cambia en la configuración del
          navegador, en los ajustes de este sitio. Si sólo cerraste el aviso sin
          responder, con volver a tocar <em>Escuchar</em> alcanza.
        </p>
      ) : null}
      {status === "dismissed" ? (
        <p className="uv-tuner__notice">
          No se concedió el permiso del micrófono. Al tocar <em>Escuchar</em> de
          nuevo el navegador vuelve a preguntar.
        </p>
      ) : null}
      {status === "failed" ? (
        <p className="uv-tuner__notice">
          No hay ningún micrófono disponible, o está siendo usado por otra
          aplicación.
        </p>
      ) : null}
      {status === "unsupported" ? (
        <p className="uv-tuner__notice">
          Este navegador no puede acceder al micrófono, así que el afinador no
          funciona aquí. El resto de la app sí.
        </p>
      ) : null}

      <div className="uv-tuner__strings">
        {strings.map((item, index) => (
          <span
            key={`${item.name}${item.octave}`}
            className="uv-tuner__chip"
            data-active={reading?.stringIndex === index}
          >
            {item.name}
            <span className="uv-tuner__octave">{item.octave}</span>
            <span className="uv-tuner__chip-hz">
              {formatHz(item.frequency)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
