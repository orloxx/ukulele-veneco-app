"use client";

/**
 * One chord, drawn.
 *
 * **It reads the instrument rather than being told it**, which is the whole of
 * `M15 · 3` on this side: `STRING_NAMES` used to be a module constant, and the
 * failure a prop would allow is a caller that forgets to pass it — a grid
 * labelled G C E A while the reader holds a cuatro, which is a diagram that is
 * wrong in a way nothing on the page shows. There are only two callers and both
 * are client components already.
 *
 * The **fingering itself never moves**. A cuatro diagram is the book's ukulele
 * diagram for the chord a tone below, chosen in `transpose.ts` before it gets
 * here; what changes in this file is only the four letters the strings are
 * called, which is what the `aria-label` is built out of.
 */

import { useInstrument } from "@/contexts/InstrumentContext";
import type { Chord } from "@/types/song";

interface ChordDiagramProps {
  chord: Chord;
  /**
   * The rendered size of the grid, in px. The drawing is a 100×100 viewBox and
   * scales; only the frame around it changes.
   */
  size?: number;
  /** Off in the chord viewer, which sets the name in heading type instead. */
  showName?: boolean;
  /**
   * Off when the caller draws the card itself — the chord viewer wraps the grid
   * in its own, and two `uv-diagram` borders inside each other read as a mistake.
   */
  frame?: boolean;
  className?: string;
}

/**
 * How many frets the grid shows at once.
 *
 * Every chord in the source cancionero fits in four — the widest span across its 2140
 * diagrams is exactly four frets — and `pnpm validate` fails a song whose chord needs
 * more, so a shape can never quietly fall outside the window again.
 */
const WINDOW = 4;

const NUT_Y = 10;
const FRET_HEIGHT = 20;
const FIRST_STRING_X = 20;
const STRING_GAP = 20;

/**
 * Where the grid starts, as a fret number offset.
 *
 * A chord that fits under the 4th fret is drawn from the nut, which is how nearly every
 * chord in the book is drawn. One that sits further up slides the window down to start at
 * its lowest fretted note, and the diagram prints that fret's number beside it — the same
 * convention the cancionero uses, and every other chord chart.
 *
 * This used to return nothing at all above the 4th fret: the string was simply not drawn,
 * so `Ab` = `5343` rendered three dots and the G string read as open (BUG-001).
 */
function windowBase(frets: number[]): number {
  const stopped = frets.filter((fret) => fret > 0);
  if (stopped.length === 0) return 0;
  const highest = Math.max(...stopped);
  if (highest <= WINDOW) return 0;
  return Math.min(...stopped) - 1;
}

export default function ChordDiagram({
  chord,
  size = 100,
  showName = true,
  frame = true,
  className,
}: ChordDiagramProps) {
  const { name, positions } = chord;
  const { instrument } = useInstrument();
  const stringNames = instrument.stringNames;

  // Parse the positions string: "0003" is the 4th, 3rd and 2nd strings open
  // and the 1st at the 3rd fret, whichever four notes those strings are tuned to.
  const strings = positions.split("").map((pos) => parseInt(pos, 10));
  const base = windowBase(strings);

  const classes = [frame ? "uv-diagram" : null, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes || undefined}>
      {/* Chord name — mono, because a chord name is musical notation. */}
      {showName && <div className="uv-diagram__name">{name}</div>}

      {/* Chord diagram */}
      <div>
        {/* Fretboard */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className="chord-diagram"
          role="img"
          aria-label={`${name}: ${strings
            .map((fret, i) =>
              fret === 0
                ? `${stringNames[i]} open`
                : `${stringNames[i]} fret ${fret}`,
            )
            .join(", ")}`}
        >
          {/* Vertical strings — G C E A on the ukulele, A D F♯ B on the cuatro */}
          {stringNames.map((stringName, stringIndex) => (
            <line
              key={`string-${stringName}`}
              x1={FIRST_STRING_X + stringIndex * STRING_GAP}
              y1={NUT_Y}
              x2={FIRST_STRING_X + stringIndex * STRING_GAP}
              y2={NUT_Y + WINDOW * FRET_HEIGHT}
              stroke="var(--diagram-string)"
              strokeWidth="1"
            />
          ))}

          {/* Horizontal frets. The top line is the nut, and is drawn thick — but only
              when the nut is actually in view. */}
          {[0, 1, 2, 3, 4].map((fretIndex) => (
            <line
              key={`fret-${fretIndex}`}
              x1={FIRST_STRING_X}
              y1={NUT_Y + fretIndex * FRET_HEIGHT}
              x2={FIRST_STRING_X + (stringNames.length - 1) * STRING_GAP}
              y2={NUT_Y + fretIndex * FRET_HEIGHT}
              stroke={
                fretIndex === 0 && base === 0
                  ? "var(--diagram-nut)"
                  : "var(--diagram-fret)"
              }
              strokeWidth={fretIndex === 0 && base === 0 ? "3" : "1"}
            />
          ))}

          {/* The number of the first fret shown, when it is not the first fret */}
          {base > 0 && (
            <text
              x={FIRST_STRING_X - 5}
              y={NUT_Y + FRET_HEIGHT * 0.5}
              textAnchor="end"
              dominantBaseline="central"
              fontSize="11"
              fontFamily="var(--font-mono)"
              fontWeight="600"
              fill="var(--diagram-label)"
            >
              {base + 1}
            </text>
          )}

          {/* Finger positions */}
          {strings.map((fret, stringIndex) => {
            const stringName = stringNames[stringIndex];
            const cx = FIRST_STRING_X + stringIndex * STRING_GAP;

            if (fret === 0) {
              // Open string — a ring above the grid. Still open in a shifted window.
              return (
                <circle
                  key={`pos-${stringName}`}
                  cx={cx}
                  cy="5"
                  r="3"
                  fill="none"
                  stroke="var(--diagram-open)"
                  strokeWidth="1.5"
                />
              );
            }

            const row = fret - base;
            if (row < 1 || row > WINDOW) return null; // validate catches this first
            return (
              <circle
                key={`pos-${stringName}`}
                cx={cx}
                cy={NUT_Y + (row - 0.5) * FRET_HEIGHT}
                r="5"
                fill="var(--diagram-dot)"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
