"use client";

/**
 * The song sheet: the screen the app exists for.
 *
 * Title, the musical facts as chips, the capo badge, the sheet itself capped at
 * `--measure-sheet`, and the chords in a panel that sticks under the header.
 */

import Link from "next/link";
import ChordDiagram from "@/components/ChordDiagram";
import { IconCapo, IconGrid } from "@/components/icons";
import LyricsDisplay from "@/components/LyricsDisplay";
import { SaveOfflineButton } from "@/components/SaveOfflineButton";
import type { ParsedSong } from "@/types/song";

interface SongDetailClientProps {
  song: Omit<ParsedSong, "filePath">; // Exclude non-serializable filePath
}

export function SongDetailClient({ song }: SongDetailClientProps) {
  const { metadata } = song;

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
            {/* Mono, because a tono and a compás are musical notation. */}
            {metadata.key && (
              <span className="uv-tag uv-tag--teal uv-tag--mono">
                {metadata.key}
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
        </div>

        <SaveOfflineButton song={song as ParsedSong} />
      </div>

      <div className="uv-song-body">
        <div className="uv-card uv-sheet-paper">
          <LyricsDisplay
            lyrics={song.lyrics}
            chordNames={song.chordDefinitions.map((chord) => chord.name)}
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
            {song.chordDefinitions.map((chord) => (
              <ChordDiagram key={chord.name} chord={chord} size={88} />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
