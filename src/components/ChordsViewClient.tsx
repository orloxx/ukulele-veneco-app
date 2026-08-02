"use client";

/**
 * The chord viewer's grid, and the control that moves it.
 *
 * This exists so `/song/<slug>/acordes` can be transposed at all: the page is
 * prerendered like every other, and the reader's key lives in `localStorage`,
 * so the diagrams have to be drawn by a client component. The page around it
 * stays a server component and keeps its own `generateStaticParams`.
 *
 * **It shares the sheet's key rather than having one of its own.** Both screens
 * go through `useTransposition`, which reads one `localStorage` key per song —
 * so a reader who moves a song to a key they can sing, then taps through to see
 * the shapes large, sees the shapes they are actually going to play. Two
 * independent controls that happened to sit on two routes for one song would be
 * the sheet saying `D` while the panel beside it says `C`, which `M11 · 3` calls
 * worse than not transposing at all.
 */

import ChordDiagram from "@/components/ChordDiagram";
import { TransposeControl } from "@/components/TransposeControl";
import { useTransposition } from "@/hooks/useTransposition";
import type { Transposition } from "@/lib/transpose";

interface ChordsViewClientProps {
  slug: string;
  transpositions: Transposition[];
}

export function ChordsViewClient({
  slug,
  transpositions,
}: ChordsViewClientProps) {
  const { current, printed, offered, choose } = useTransposition(
    slug,
    transpositions,
  );

  return (
    <>
      <TransposeControl
        id={`transpose-acordes-${slug}`}
        offered={offered}
        current={current}
        printed={printed}
        onChoose={choose}
      />

      <div className="uv-chords-view__grid">
        {current.chords.map((chord) => (
          <div key={chord.name} className="uv-diagram uv-chords-view__card">
            <div className="uv-diagram__name uv-chords-view__name">
              {chord.name}
            </div>
            <ChordDiagram
              chord={chord}
              size={132}
              showName={false}
              frame={false}
            />
            {/* The fingering as it is written in `songs/`, for anyone reading
                the diagram back against the file. In a transposed key it is
                still a fingering the book prints — just on another song's page,
                which is the whole of vault `DECISIONS.md` 6 holding. */}
            <div className="uv-chords-view__positions">{chord.positions}</div>
          </div>
        ))}
      </div>
    </>
  );
}
