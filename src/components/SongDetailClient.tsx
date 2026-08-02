"use client";

/**
 * The song sheet: the screen the app exists for.
 *
 * Title, the musical facts as chips, the capo badge, the sheet itself capped at
 * `--measure-sheet`, and the chords in a panel that sticks under the header.
 */

import Link from "next/link";
import { useRef } from "react";
import { AutoScrollBar } from "@/components/AutoScrollBar";
import ChordDiagram from "@/components/ChordDiagram";
import { IconCapo, IconGrid } from "@/components/icons";
import LyricsDisplay from "@/components/LyricsDisplay";
import { SaveOfflineButton } from "@/components/SaveOfflineButton";
import { TransposeControl } from "@/components/TransposeControl";
import { VideoReference } from "@/components/VideoReference";
import { useTransposition } from "@/hooks/useTransposition";
import type { Transposition } from "@/lib/transpose";
import type { ParsedSong, SongVideo } from "@/types/song";

interface SongDetailClientProps {
  song: Omit<ParsedSong, "filePath">; // Exclude non-serializable filePath
  /**
   * Every key this song can be played in, resolved at build time.
   *
   * The vocabulary index this is derived from is most of the collection's chord
   * data and never reaches the browser (`M11 · 1`); what arrives is this song's
   * own answer, which is at most twelve short chord lists.
   */
  transpositions: Transposition[];
  /**
   * This song's reference recording, if the search found one it would stand
   * behind. Resolved at build time by `getSongVideo`, and one entry rather than
   * the map for the same reason `transpositions` is one song's keys.
   */
  video?: SongVideo;
}

export function SongDetailClient({
  song,
  transpositions,
  video,
}: SongDetailClientProps) {
  const { metadata } = song;
  const { current, printed, offered, moved, choose } = useTransposition(
    song.slug,
    transpositions,
  );

  // The sheet, handed to the auto-scroll bar so the pace can be resolved
  // against the lyrics' own line box rather than against a constant. It goes on
  // the paper rather than inside LyricsDisplay: that component is the most
  // sensitive code in the app and this feature has no business in it.
  const sheetRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <div className="uv-song-head">
        <div>
          <h1 className="uv-song-title">{metadata.title}</h1>
          <p className="uv-song-byline">
            {metadata.artist}
            {metadata.year ? ` · ${metadata.year}` : ""}
          </p>

          <div className="uv-song-chips">
            {/* Mono, because a tono and a compás are musical notation.

                The chip carries the key the sheet is *in*, not the one the file
                holds: a sheet whose chords moved and whose tono did not is the
                app contradicting itself. `data-moved` is what stops it passing
                for the book's own page — see the marker under the control. */}
            {current.key && (
              <span
                className="uv-tag uv-tag--teal uv-tag--mono"
                data-moved={moved ? "" : undefined}
              >
                {current.key}
              </span>
            )}
            <span className="uv-tag uv-tag--outline uv-tag--mono">
              {metadata.timeSignature}
            </span>
            {/* Amarillo: a capo is an instruction to the player, not a fact
                about the song, so it should be the first thing spotted. */}
            {metadata.capo ? (
              <span className="uv-capo">
                <IconCapo />
                Capo {metadata.capo}
              </span>
            ) : null}
          </div>

          {/* Whatever else the book printed in that slot: "Versión más simple
              para el ukulele", a duet's voice legend, a century. Verbatim. */}
          {metadata.notes?.map((note) => (
            <p key={note} className="uv-song-note">
              {note}
            </p>
          ))}

          {/* The capo is untouched by all of this, and that is the decision
              rather than an omission: `key` is the *written* key, so the badge
              above and the shapes below are independent. Leave the capo where
              the book put it, move the shapes, and the sounding key moves by
              the same amount — see `transpose.ts`. */}
          <TransposeControl
            id={`transpose-${song.slug}`}
            offered={offered}
            current={current}
            printed={printed}
            onChoose={choose}
          />
        </div>

        <SaveOfflineButton song={song as ParsedSong} />
      </div>

      {/* Above the sticky bar, and the order of these two lines is the whole of
          why expanding a video does not throw the sheet somewhere: the frame
          mounts after the toggle, so it grows below the thing the reader just
          pressed. Measured at 0px of sheet movement in the worst case, which is
          the only claim worth making here. See the component. */}
      <VideoReference video={video} />

      <AutoScrollBar slug={song.slug} sheetRef={sheetRef} />

      <div className="uv-song-body">
        <div className="uv-card uv-sheet-paper" ref={sheetRef}>
          <LyricsDisplay
            lyrics={song.lyrics}
            chordNames={song.chordDefinitions.map((chord) => chord.name)}
            chordNameMap={current.names}
          />
        </div>

        <aside className="uv-chord-panel">
          <div className="uv-chord-panel__head">
            <h2 className="uv-chord-panel__title">Acordes</h2>
            <Link
              href={`/song/${song.slug}/acordes`}
              className="uv-iconbtn"
              aria-label="Ver los acordes en grande"
            >
              <IconGrid />
            </Link>
          </div>
          <div className="uv-chord-panel__grid">
            {current.chords.map((chord) => (
              <ChordDiagram key={chord.name} chord={chord} size={88} />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
