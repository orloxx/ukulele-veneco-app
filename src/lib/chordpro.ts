/**
 * The ChordPro reader — the one place in this repo that knows what a `.cho`
 * file looks like.
 *
 * Since M18 `songs/` is [ChordPro](https://www.chordpro.org) rather than a
 * format only this repo could read. The reason is the author's: Ciro Durán
 * asked on 2026-08-24 whether the cancionero could go back to ChordPro source,
 * because ChordPro is his own toolchain — text in, printed songbook out. So the
 * collection now speaks a standard other tools already read, and this module is
 * about 100 lines rather than a dependency (vault `DECISIONS.md` 39).
 *
 * **It parses, it does not judge.** Every rule about what a song file may
 * contain lives in `scripts/validate-songs.mjs`, which reads `directives` and
 * their line numbers. Keeping the two apart is what lets the app be forgiving
 * about a file the validator would fail — a missing `{artist:}` renders a song
 * with no artist rather than breaking a build.
 *
 * **The short forms are deliberately not read.** `{t:}`, `{st:}`, `{c:}`,
 * `{soc}` are all legal ChordPro and none of them is in `songs/`: one spelling
 * per directive keeps a grep for `{key:}` honest, and the validator says so.
 */

/** One `{name: value}` or `{name}`, with the line it was written on. */
export interface ChordProDirective {
  name: string;
  /** Everything between the colon and the closing brace, trimmed. */
  value: string;
  /** 1-based, counted in the file. */
  line: number;
}

/**
 * A chord as the file draws it, and as `songs/` has always held it.
 *
 * `positions` is the four-digit GCEA fret string every other module in this app
 * already speaks — `ChordDiagram`, `vocabulary.ts`, `transpose.ts`. ChordPro's
 * `base-fret`/`frets` pair is the same information written the way the standard
 * writes it, and this is where the two meet.
 */
export interface ChordProDefine {
  name: string;
  positions: string;
  line: number;
}

export interface ChordProFile {
  directives: ChordProDirective[];
  /**
   * The sheet, verbatim, with one substitution: a section directive becomes the
   * `## <label>` line the renderer has always drawn as a heading.
   *
   * That marker is now an internal shape rather than a file format —
   * `LyricsDisplay` never learned ChordPro, and does not need to, because how a
   * chord is held over its syllable is the most sensitive code in the app and
   * M18 had no business inside it.
   */
  lyrics: string;
}

/** `{name}` or `{name: value}` alone on a line. Names are lowercase and `_`. */
const DIRECTIVE = /^\{([a-z_]+)(?::([\s\S]*))?\}$/;

/**
 * Is this line a directive rather than part of the sheet?
 *
 * Exported so `scripts/validate-songs.mjs` walks a file the same way this
 * module does. It checks the sheet — spacing, anticipations, a stray brace —
 * and needs the real line number to report against, which is the one thing
 * `parseChordPro` throws away.
 */
export function isDirectiveLine(line: string): boolean {
  return DIRECTIVE.test(line.trim());
}

/**
 * Split a `.cho` file into its directives and its sheet.
 *
 * Order does not matter and no header/body boundary is looked for: a
 * `{subtitle:}` is a line under the title wherever it sits, and a `{comment:}`
 * is a line in the sheet wherever it sits. That is one less rule than a
 * two-section file would need, and it is the difference between the two
 * directives rather than their position.
 */
export function parseChordPro(source: string): ChordProFile {
  const directives: ChordProDirective[] = [];
  const lyrics: string[] = [];

  source.split(/\r?\n/).forEach((line, index) => {
    const match = DIRECTIVE.exec(line.trim());
    if (!match) {
      lyrics.push(line);
      return;
    }

    const [, name, rest] = match;
    const value = (rest ?? "").trim();
    directives.push({ name, value, line: index + 1 });

    // A section's label and a comment are both a bold line the book prints
    // above what follows, and the sheet has drawn both as `## …` since M7.
    // Everything else — the song's metadata, its chord shapes, an `{end_of_…}`
    // closing an environment, a directive this reader has never heard of —
    // prints nothing.
    if (name === "comment" || name.startsWith("start_of_")) {
      lyrics.push(`## ${value}`);
    }
  });

  // Blank lines only — a sheet line may legitimately start with spaces, and an
  // alignment is the one thing this migration may not touch.
  while (lyrics.length && !lyrics[0].trim()) lyrics.shift();
  while (lyrics.length && !lyrics[lyrics.length - 1].trim()) lyrics.pop();

  return { directives, lyrics: lyrics.join("\n") };
}

/**
 * Read one `{define: …}` into the four digits the rest of the app speaks.
 *
 * `{define: C#  base-fret 4 frets 3 2 1 1}` is `6544`: ChordPro numbers the
 * frets from the top of the diagram, and `base-fret` says which fret that is.
 * The collection's own numbers are absolute, so they come back by adding the
 * offset — and an open string stays open, which is why the `0` is guarded.
 *
 * Returns `null` for anything malformed. The validator turns that into an error
 * with a line number; the app renders the song without the chord rather than
 * failing to build.
 */
export function parseDefine(
  directive: ChordProDirective,
): ChordProDefine | null {
  const match = /^(\S+)\s+base-fret\s+(\d+)\s+frets\s+(\d+(?:\s+\d+){3})$/.exec(
    directive.value,
  );
  if (!match) return null;

  const [, name, base, frets] = match;
  const offset = Number(base) - 1;
  const positions = frets
    .split(/\s+/)
    .map((fret) => (Number(fret) === 0 ? 0 : Number(fret) + offset));

  if (positions.some((fret) => fret > 9)) return null;

  return { name, positions: positions.join(""), line: directive.line };
}

/**
 * The `base-fret`/`frets` pair for a four-digit GCEA string — `parseDefine`
 * backwards, and the one writer of it.
 *
 * The window it chooses is `ChordDiagram`'s own: the nut stays in view while
 * the shape fits in the first four frets, and above that the diagram slides up
 * to the lowest stopped fret. That is not decoration — a `{define:}` at
 * `base-fret 1` with a finger on the 8th fret asks every renderer, Ciro's
 * included, to draw eight frets of empty neck.
 */
export function formatFrets(positions: string): string {
  const frets = positions.split("").map(Number);
  const stopped = frets.filter((fret) => fret > 0);
  const offset =
    stopped.length > 0 && Math.max(...stopped) > 4
      ? Math.min(...stopped) - 1
      : 0;

  const drawn = frets.map((fret) => (fret === 0 ? 0 : fret - offset));
  return `base-fret ${offset + 1} frets ${drawn.join(" ")}`;
}
