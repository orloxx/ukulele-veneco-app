"use client";

import { useId, useState } from "react";
import { IconPlay } from "@/components/icons";
import { useIsOffline } from "@/hooks/useIsOffline";
import type { SongVideo } from "@/types/song";

/**
 * A reference recording for the song, collapsed until somebody asks for it.
 *
 * **Collapsed has to mean nothing happened.** This app makes no third-party
 * request at all: `next/font` self-hosts its three families precisely so an
 * offline-first PWA calls nobody, there is no analytics, and `runtimeCaching` in
 * `next.config.ts` has no cross-origin rule and gains none for this. An embed is
 * the first call to anyone else this project has ever made, and the only thing
 * that confines it to a reader who asked for it is that the `<iframe>` does not
 * exist until they do. `display: none` on a mounted frame is not the same thing
 * — the browser loads it, Google sets what it sets, and the request happens for
 * every reader of every song page whether or not the panel is ever opened.
 *
 * **That is also why there is no poster thumbnail**, which is the first thing
 * every video-disclosure design reaches for and does look better:
 * `i.ytimg.com/vi/<id>/hqdefault.jpg` is exactly the same property given away,
 * on every song page load, for a picture. Vault `DECISIONS.md` 25.
 *
 * ## What is printed here is the evidence the match was made on
 *
 * The title, channel and duration in `data/videos.json` were stored so that
 * `M14 · 5` could review 276 matches by reading rather than by watching. Printing
 * them costs one muted line and buys two things: the reader can see whose
 * recording it is *before* the request is made rather than after, and a wrong
 * match becomes visible without playing it — which matters because there is no
 * backend and no report button, so a reader noticing the channel is a karaoke
 * upload is the whole of this feature's feedback loop.
 *
 * ## What expanding it does to the auto-scroll, measured rather than argued
 *
 * It sits between the song head and `AutoScrollBar`, so it is **above** the
 * sticky bar and scrolls away with the title. Expanding it grows the document by
 * the height of a 16:9 frame, and `useAutoScroll` compares `window.scrollY`
 * against the position it last wrote and hands the page back on a difference of
 * more than four pixels — so the obvious worry is that opening a video mid-song
 * throws the sheet somewhere.
 *
 * **It does not, and the reason is the order of the two elements rather than
 * anything either of them knows.** The frame mounts *after* the button, so it can
 * only ever grow below the thing the reader just pressed — and the button has to
 * be at least partly on screen to be pressed at all. Measured on the shipped
 * build, in the worst state there is (the toggle clipped by the viewport top,
 * 72px of it above the fold, the sheet scrolling): `window.scrollY` moves 442 →
 * 646, and **the sheet moves zero pixels on screen**. Scroll anchoring absorbs
 * the whole of it.
 *
 * What the 204px *does* do is stop the auto-scroll, because that is exactly what
 * the loop is built to read it as. **That is left alone rather than worked
 * around.** Nothing jumps, which is the failure that would have mattered, and a
 * reader who has just opened a recording is about to follow the record rather
 * than a pace they set. Coupling the two components so the scroll survives would
 * buy a behaviour nobody has asked for at the cost of the one thing
 * `AutoScrollBar` and this file currently share, which is nothing. `M14 · 5` is
 * where a person with an instrument decides whether that is right.
 */

/** The embed host that sets nothing until the reader presses play. */
const EMBED_ORIGIN = "https://www.youtube-nocookie.com/embed";

/** Where to send a reader whose embed will not play. */
const WATCH_ORIGIN = "https://www.youtube.com/watch";

/**
 * The channel as a person would say it.
 *
 * YouTube generates a channel called `<artist> - Topic` from a licensed
 * distribution feed, and 113 of the 261 references are on one — so without this
 * the suffix lands on 43% of the song pages in the app, where it reads as
 * something broken rather than as the name of anything. It is plumbing, and on
 * exactly these channels the name with it removed *is* the artist.
 *
 * **`data/videos.json` keeps the raw name and this is the only place it is
 * trimmed.** The file is the record and has to say what YouTube says, so that a
 * match can be looked up years from now; the screen is prose.
 */
function channelName(channel: string): string {
  return channel.replace(/ - Topic$/, "");
}

interface VideoReferenceProps {
  /** This song's entry, or nothing at all — most of the collection has one. */
  video?: SongVideo;
}

export function VideoReference({ video }: VideoReferenceProps) {
  const [expanded, setExpanded] = useState(false);
  const isOffline = useIsOffline();
  const panelId = useId();

  // A song the search declined gets no panel, not an empty one and not a
  // disabled control: the cancionero prints it and YouTube does not have a
  // recording anybody could find, which is not a page with something missing
  // from it.
  if (!video) return null;

  // Offline, and not yet opened: a sentence rather than a greyed-out button,
  // the same call `.uv-transpose__none` makes for the 18 songs with no other
  // key. A disabled control says the app is broken; what is true is that a
  // video needs signal and the rest of this page does not.
  //
  // It is deliberately *only* checked while collapsed. Yanking a frame out from
  // under a reader whose video is buffered and still playing would be the app
  // enforcing a rule against the person it is for.
  if (isOffline && !expanded) {
    return (
      <p className="uv-video__offline">
        Sin conexión no hay vídeo. La letra y los acordes sí funcionan.
      </p>
    );
  }

  return (
    <section className="uv-video">
      <button
        type="button"
        className="uv-video__toggle"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((open) => !open)}
      >
        <IconPlay />
        <span className="uv-video__label">
          {expanded ? "Ocultar el vídeo" : "Escuchar cómo suena"}
        </span>
        <span className="uv-video__meta">
          {video.title} · {channelName(video.channel)} · {video.duration}
        </span>
      </button>

      {/* The wrapper is always in the tree so `aria-controls` points at
          something; the frame inside it is not. Hidden-and-empty is what makes
          the disclosure honest. */}
      <div className="uv-video__panel" id={panelId} hidden={!expanded}>
        {expanded ? (
          <>
            <div className="uv-video__frame">
              <iframe
                // Never autoplay. Expanding is a gesture the browser would
                // accept, but a reader who opened this by accident should not
                // have the room told about it.
                src={`${EMBED_ORIGIN}/${video.id}`}
                title={video.title}
                // Only what a player needs. `encrypted-media` is playback
                // itself; the other two are things a reader asks for by
                // pressing something.
                allow="encrypted-media; fullscreen; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            {/* Some uploads forbid embedding, and the frame then shows YouTube's
                own refusal rather than anything this app can catch. The link
                makes no request until it is followed. */}
            <p className="uv-video__note">
              Se reproduce desde YouTube. Si no se ve,{" "}
              <a
                href={`${WATCH_ORIGIN}?v=${video.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                ábrelo allí
              </a>
              .
            </p>
          </>
        ) : null}
      </div>
    </section>
  );
}
