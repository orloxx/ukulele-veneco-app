"use client";

interface LyricsDisplayProps {
  lyrics: string;
  /**
   * The names of the chords this song defines.
   *
   * Needed because a chord in round brackets is only a chord if the song says so: the
   * cancionero uses round brackets for backing vocals and asides too, and
   * `(Cuidado, mucho cuidado)` in colgando-en-tus-manos must stay as words.
   */
  chordNames: string[];
}

interface LinePart {
  chord?: string;
  /** True for `(X)` — the chord arriving early rather than one to strum. */
  anticipated?: boolean;
  text: string;
}

export default function LyricsDisplay({
  lyrics,
  chordNames,
}: LyricsDisplayProps) {
  const defined = new Set(chordNames);

  // Parse a line to extract chords and text
  const parseLine = (line: string) => {
    const parts: LinePart[] = [];
    let currentIndex = 0;

    // `[X]` is a chord to strum; `(X)` is an anticipation — the same chord landing
    // early, optional or passing, which is what the book means by the round brackets
    // (DECISIONS.md 9 in the vault). Both float above the syllable they sit on, and
    // only the styling tells them apart.
    const chordRegex = /\[([^\]]+)\]|\(([^()\s]+)\)/g;
    let match: RegExpExecArray | null = chordRegex.exec(line);

    while (match !== null) {
      const [whole, bracketed, parenthesised] = match;
      const chord =
        bracketed ?? (defined.has(parenthesised) ? parenthesised : undefined);

      // Round brackets around anything the song has not defined are ordinary words,
      // so they are left in the text: skipping the match without moving currentIndex
      // means the next slice picks them up.
      if (chord) {
        // Add text before the chord
        if (match.index > currentIndex) {
          parts.push({ text: line.slice(currentIndex, match.index) });
        }

        // Add the chord
        parts.push({
          chord,
          anticipated: bracketed === undefined,
          text: "",
        });
        currentIndex = match.index + whole.length;
      }

      match = chordRegex.exec(line);
    }

    // Add remaining text
    if (currentIndex < line.length) {
      parts.push({ text: line.slice(currentIndex) });
    }

    return parts;
  };

  const renderLine = (line: string, index: number) => {
    // Check if it's a section header (starts with ##)
    if (line.trim().startsWith("##")) {
      return (
        <h3
          key={index}
          className="text-lg font-semibold text-gray-700 mt-6 mb-2"
        >
          {line.replace(/^##\s*/, "")}
        </h3>
      );
    }

    // Empty line
    if (!line.trim()) {
      return <div key={index} className="h-4" />;
    }

    // Parse the line for chords
    const parts = parseLine(line);

    return (
      <div key={index} className="relative min-h-10 mb-1 leading-10">
        <div className="flex flex-wrap items-baseline">
          {parts.map((part, partIndex) => (
            <span
              key={`${index}-${partIndex}-${part.chord || "text"}`}
              className="relative inline-block"
            >
              {part.chord && (
                <span
                  className={`absolute -top-8 left-0 text-sm whitespace-nowrap ${
                    part.anticipated
                      ? "text-gray-500 font-medium"
                      : "text-blue-600 font-bold"
                  }`}
                >
                  {part.anticipated ? `(${part.chord})` : part.chord}
                </span>
              )}
              <span className="text-gray-800 whitespace-pre-wrap">
                {part.text}
              </span>
            </span>
          ))}
        </div>
      </div>
    );
  };

  const lines = lyrics.split("\n");

  return (
    <div className="font-mono text-base leading-relaxed">
      {lines.map((line, index) => renderLine(line, index))}
    </div>
  );
}
