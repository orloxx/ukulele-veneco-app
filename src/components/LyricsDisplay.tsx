"use client";

interface LyricsDisplayProps {
  lyrics: string;
}

export default function LyricsDisplay({ lyrics }: LyricsDisplayProps) {
  // Parse a line to extract chords and text
  const parseLine = (line: string) => {
    const parts: Array<{ chord?: string; text: string }> = [];
    let currentIndex = 0;

    // Regex to find [ChordName] patterns
    const chordRegex = /\[([^\]]+)\]/g;
    let match: RegExpExecArray | null = chordRegex.exec(line);

    while (match !== null) {
      // Add text before the chord
      if (match.index > currentIndex) {
        parts.push({ text: line.slice(currentIndex, match.index) });
      }

      // Add the chord
      parts.push({ chord: match[1], text: "" });
      currentIndex = match.index + match[0].length;

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
                <span className="absolute -top-8 left-0 text-blue-600 font-bold text-sm whitespace-nowrap">
                  {part.chord}
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
