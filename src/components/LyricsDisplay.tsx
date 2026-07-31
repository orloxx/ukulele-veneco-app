"use client";

interface LyricsDisplayProps {
  lyrics: string;
  /**
   * The names of the chords this song defines.
   *
   * Needed because a chord in round brackets is only a chord if the song says so:
   * the cancionero uses round brackets for backing vocals and asides too, and
   * `(Cuidado, mucho cuidado)` in colgando-en-tus-manos must stay as words.
   */
  chordNames: string[];
}

interface LinePart {
  chord?: string;
  /** True for `(X)` — the chord arriving early rather than one to strum. */
  anticipated?: boolean;
  /** The text the chord sits over. A chord is never its own empty part. */
  text: string;
}

/**
 * A song sheet.
 *
 * How a chord is held over its syllable is the whole of this component, and it
 * is the most sensitive code in the app: a redesign that quietly moves a chord
 * one syllable to the left is worse than no redesign, because it looks correct
 * and plays wrong. Nothing automated catches it: `pnpm validate` reads the
 * source Markdown and never looks at the screen, and since M6 it is the only
 * check there is — the extractor's `--verify` compared fingerings against the
 * printed book, and it went with the book.
 *
 * Two things do the holding, and they are a pair:
 *
 * - Every chord is attached to the text that *follows* it, and positioned at
 *   `bottom: 100%` of that text's own box. It is never pushed as its own part
 *   with an empty string, which is what the first version did.
 * - The room it needs is reserved as `padding-top: var(--lyric-chord-gap)` on
 *   the line, not as leading inside it. The old version offset the chord from
 *   the baseline and depended on the line-height being generous enough to hold
 *   it; where it was not, a chord climbed onto the line above.
 *
 * There is deliberately no zoom control here, and no `--sheet-scale` in
 * `globals.css` to drive one — vault `DECISIONS.md` 13. The design prototype
 * ships a −/+ that scales the lyric type, so this will be re-proposed by anyone
 * who opens it. The browser already has pinch-zoom and the phone already has a
 * system text-size setting; both work, both persist, and both follow the reader
 * to every other screen, which a control living inside one page of one app never
 * will. What the app owes them instead is `maximumScale: 5` and
 * `userScalable: true` in the viewport, which `layout.tsx` keeps.
 */
export default function LyricsDisplay({
  lyrics,
  chordNames,
}: LyricsDisplayProps) {
  const defined = new Set(chordNames);

  const parseLine = (line: string) => {
    const parts: LinePart[] = [];

    // `[X]` is a chord to strum; `(X)` is an anticipation — the same chord
    // landing early, optional or passing, which is what the book means by the
    // round brackets (DECISIONS.md 9 in the vault). Only the styling tells them
    // apart, and it must not be flattened: rojo means strum this, muted grey
    // with its brackets still on means maybe.
    const chordRegex = /\[([^\]]+)\]|\(([^()\s]+)\)/g;

    let cursor = 0;
    let pending: LinePart | null = null;
    let match: RegExpExecArray | null = chordRegex.exec(line);

    while (match !== null) {
      const [whole, bracketed, parenthesised] = match;
      const chord =
        bracketed ?? (defined.has(parenthesised) ? parenthesised : undefined);

      // Round brackets around anything the song has not defined are ordinary
      // words, so they are left in the text: skipping the match without moving
      // the cursor means the next slice picks them up.
      if (chord) {
        const text = line.slice(cursor, match.index);
        if (pending) {
          pending.text = text;
          parts.push(pending);
        } else if (text) {
          parts.push({ text });
        }
        pending = { chord, anticipated: bracketed === undefined, text: "" };
        cursor = match.index + whole.length;
      }

      match = chordRegex.exec(line);
    }

    const tail = line.slice(cursor);
    if (pending) {
      pending.text = tail;
      parts.push(pending);
    } else if (tail) {
      parts.push({ text: tail });
    }

    return parts;
  };

  const renderLine = (line: string, index: number) => {
    if (line.trim().startsWith("##")) {
      return (
        <h3 key={index} className="uv-sheet-section">
          {line.replace(/^##\s*/, "")}
        </h3>
      );
    }

    if (!line.trim()) {
      return <div key={index} className="uv-sheet-blank" />;
    }

    return (
      <div key={index} className="uv-sheet-line">
        {parseLine(line).map((part, partIndex) => (
          <span
            key={`${index}-${partIndex}-${part.chord || "text"}`}
            className="uv-sheet-syllable"
          >
            {part.chord && (
              <span
                className={
                  part.anticipated
                    ? "uv-chord uv-chord--anticipated"
                    : "uv-chord"
                }
              >
                {part.anticipated ? `(${part.chord})` : part.chord}
              </span>
            )}
            {part.text}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="uv-sheet">
      {lyrics.split("\n").map((line, index) => renderLine(line, index))}
    </div>
  );
}
