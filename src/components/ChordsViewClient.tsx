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
import { useInstrument } from "@/contexts/InstrumentContext";
import { useTransposition } from "@/hooks/useTransposition";
import type { InstrumentId } from "@/lib/instrument";
import type { Transposition } from "@/lib/transpose";

interface ChordsViewClientProps {
  slug: string;
  /** The written key the book printed — see `useTransposition`. */
  printedKey: string;
  transpositions: Record<InstrumentId, Transposition[]>;
}

export function ChordsViewClient({
  slug,
  printedKey,
  transpositions,
}: ChordsViewClientProps) {
  const { instrument } = useInstrument();
  const { current, offered, printedKeyUnavailable, choose } = useTransposition(
    slug,
    transpositions[instrument.id],
    printedKey,
  );

  return (
    <>
      {/* The only place in the app that says how the notation works, and since
          M15 it says it for the instrument on screen. It is here rather than on
          the page around it because the page is a server component and cannot
          know which instrument the reader picked. */}
      <p className="uv-chords-view__lede">
        Cuerdas de arriba abajo:{" "}
        <span className="uv-mono">{instrument.stringNames.join(" ")}</span>. El
        círculo arriba es cuerda al aire; el número al lado dice en qué traste
        empieza la cuadrícula.
      </p>

      <TransposeControl
        id={`transpose-acordes-${slug}`}
        offered={offered}
        current={current}
        printedKey={printedKey}
        printedKeyUnavailable={printedKeyUnavailable}
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
