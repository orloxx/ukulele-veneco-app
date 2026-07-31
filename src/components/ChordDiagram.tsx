import type { Chord } from "@/types/song";

interface ChordDiagramProps {
  chord: Chord;
}

/** Strings low to high — the order a `positions` string is written in. */
const STRING_NAMES = ["G", "C", "E", "A"];

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

export default function ChordDiagram({ chord }: ChordDiagramProps) {
  const { name, positions } = chord;

  // Parse the positions string (e.g., "0003" means strings G=0, C=0, E=0, A=3)
  const strings = positions.split("").map((pos) => parseInt(pos, 10));
  const base = windowBase(strings);

  return (
    <div className="flex flex-col items-center p-3 bg-white border border-gray-200 rounded-lg">
      {/* Chord name */}
      <div className="text-lg font-bold text-gray-900 mb-2">{name}</div>

      {/* Chord diagram */}
      <div className="relative">
        {/* Fretboard */}
        <svg
          width="100"
          height="100"
          viewBox="0 0 100 100"
          className="chord-diagram"
          role="img"
          aria-label={`${name}: ${strings
            .map((fret, i) =>
              fret === 0
                ? `${STRING_NAMES[i]} open`
                : `${STRING_NAMES[i]} fret ${fret}`,
            )
            .join(", ")}`}
        >
          {/* Vertical strings (4 strings for ukulele: G C E A) */}
          {STRING_NAMES.map((stringName, stringIndex) => (
            <line
              key={`string-${stringName}`}
              x1={FIRST_STRING_X + stringIndex * STRING_GAP}
              y1={NUT_Y}
              x2={FIRST_STRING_X + stringIndex * STRING_GAP}
              y2={NUT_Y + WINDOW * FRET_HEIGHT}
              stroke="#333"
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
              x2={FIRST_STRING_X + (STRING_NAMES.length - 1) * STRING_GAP}
              y2={NUT_Y + fretIndex * FRET_HEIGHT}
              stroke="#333"
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
              fill="#333"
            >
              {base + 1}
            </text>
          )}

          {/* Finger positions */}
          {strings.map((fret, stringIndex) => {
            const stringName = STRING_NAMES[stringIndex];
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
                  stroke="#333"
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
                fill="#2563eb"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
