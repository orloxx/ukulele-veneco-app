"use client";

/**
 * Client wrapper for song detail page
 * Handles interactive features like saving offline
 */

import ChordDiagram from "@/components/ChordDiagram";
import LyricsDisplay from "@/components/LyricsDisplay";
import { SaveOfflineButton } from "@/components/SaveOfflineButton";
import type { ParsedSong } from "@/types/song";

interface SongDetailClientProps {
  song: Omit<ParsedSong, "filePath">; // Exclude non-serializable filePath
}

export function SongDetailClient({ song }: SongDetailClientProps) {
  return (
    <div className="relative">
      {/* Main content */}
      <div>
        {/* Save button - positioned top right */}
        <div className="absolute top-0 right-0">
          <SaveOfflineButton
            song={song as ParsedSong}
            variant="full"
            className="shadow-md"
          />
        </div>

        {/* Song info */}
        <div className="mb-8 pr-32">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {song.metadata.title}
          </h1>
          <p className="text-xl text-gray-600">
            {song.metadata.artist}
            {song.metadata.year && ` • ${song.metadata.year}`}
          </p>
          <p className="text-xl text-gray-600">
            {song.metadata.timeSignature} • {song.metadata.key}
          </p>
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: Lyrics */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <LyricsDisplay
                lyrics={song.lyrics}
                chordNames={song.chordDefinitions.map((chord) => chord.name)}
              />
            </div>
          </div>

          {/* Right column: Chords (sticky) */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Acordes
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-4">
                {song.chordDefinitions.map((chord) => (
                  <ChordDiagram key={chord.name} chord={chord} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
