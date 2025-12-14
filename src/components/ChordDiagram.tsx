import type { Chord } from "@/types/song";

interface ChordDiagramProps {
  chord: Chord;
}

export default function ChordDiagram({ chord }: ChordDiagramProps) {
  const { name, positions } = chord;

  // Parse the positions string (e.g., "0003" means strings G=0, C=0, E=0, A=3)
  const strings = positions.split("").map((pos) => parseInt(pos, 10));

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
        >
          {/* Vertical strings (4 strings for ukulele: G C E A) */}
          {[0, 1, 2, 3].map((stringIndex) => (
            <line
              key={`string-${stringIndex}`}
              x1={20 + stringIndex * 20}
              y1="10"
              x2={20 + stringIndex * 20}
              y2="90"
              stroke="#333"
              strokeWidth="1"
            />
          ))}

          {/* Horizontal frets (4 frets shown) */}
          {[0, 1, 2, 3, 4].map((fretIndex) => (
            <line
              key={`fret-${fretIndex}`}
              x1="20"
              y1={10 + fretIndex * 20}
              x2="80"
              y2={10 + fretIndex * 20}
              stroke="#333"
              strokeWidth={fretIndex === 0 ? "3" : "1"}
            />
          ))}

          {/* Finger positions */}
          {strings.map((fret, stringIndex) => {
            const stringNames = ["G", "C", "E", "A"];
            const stringName = stringNames[stringIndex];

            if (fret === 0) {
              // Open string - draw circle above the nut
              return (
                <circle
                  key={`pos-${stringName}`}
                  cx={20 + stringIndex * 20}
                  cy="5"
                  r="3"
                  fill="none"
                  stroke="#333"
                  strokeWidth="1.5"
                />
              );
            } else if (fret > 0 && fret <= 4) {
              // Fretted note - draw filled circle
              return (
                <circle
                  key={`pos-${stringName}`}
                  cx={20 + stringIndex * 20}
                  cy={10 + (fret - 0.5) * 20}
                  r="5"
                  fill="#2563eb"
                />
              );
            }
            return null;
          })}
        </svg>
      </div>
    </div>
  );
}
