#!/usr/bin/env node
/**
 * validate-songs.mjs — check every file in songs/ against the format spec.
 *
 *   pnpm validate            check songs/
 *   pnpm validate --quiet    print only what is wrong
 *
 * Since M18 the format is [ChordPro](https://www.chordpro.org) and most of it is
 * somebody else's document. What is left here is the half the standard does not
 * cover, and it is the half this collection cares about: a fingering is the
 * book's own diagram, a coined name is a different chord from the name it is
 * coined from, no Cyrillic ever, and a chord sits over the syllable it is played
 * on. See songs/README.md.
 *
 * Exits non-zero when anything is an error. Warnings never fail the run: they mark
 * things worth a look that are not wrong on their own.
 */

import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

/**
 * Read songs/ with the app's own reader.
 *
 * A validator with its own parser proves the two agree and nothing about
 * whether either is right — the same argument `check-transpose.mjs` makes, and
 * the more pointed one here: this command's whole job is to fail on a file the
 * app would then misread.
 */
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const target = path.join(REPO_ROOT, "src", specifier.slice(2));
      return { url: `${pathToFileURL(target).href}.ts`, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const { parseChordPro, parseDefine, isDirectiveLine } = await import(
  "@/lib/chordpro"
);
const { SONG_EXTENSION } = await import("@/lib/songs");

const SONGS = path.join(REPO_ROOT, "songs");

/** Chord markers the spacing rules treat as attached to the chord that precedes them. */
const MARKERS = "·◦↓↑";

/**
 * How many frets ChordDiagram.tsx shows at once.
 *
 * It slides that window up the neck to wherever the chord sits, so a high fret is fine;
 * what it cannot draw is a shape whose fingers are spread over more frets than the window
 * holds. The widest chord in the source cancionero spans exactly this many, so anything
 * wider is a transcription error rather than a real fingering — which is why this is an
 * error and not a warning. Keep it in step with `WINDOW` in ChordDiagram.tsx.
 */
const WINDOW_FRETS = 4;

/**
 * Every directive this collection writes, and deliberately no more.
 *
 * ChordPro defines a great many and abbreviates most of them — `{t:}` for
 * `{title:}`, `{soc}` for `{start_of_chorus}`. None of the short forms is in
 * `songs/` and none is read by `src/lib/chordpro.ts`: one spelling per directive
 * is what keeps a grep for `{key:}` honest across 276 files, and an unknown
 * directive is far more often a typo than a feature. A file that wants one of
 * the others adds it here first.
 */
const DIRECTIVES = new Set([
  "title",
  "artist",
  "year",
  "key",
  "time",
  "capo",
  "subtitle",
  "define",
  "comment",
  "start_of_verse",
  "end_of_verse",
  "start_of_chorus",
  "end_of_chorus",
]);

/** The directives a song cannot be a song without. */
const REQUIRED = ["title", "artist", "key", "time"];

/**
 * The filename a song's title should produce.
 *
 * Accents fold, everything that is not a letter or digit becomes a hyphen. A title
 * carrying a parenthetical — `It Never Ends (Quinta Anauco)` — may either keep it or
 * drop it, because the book uses parentheses for two different jobs: an alternative
 * title, which the slug drops, and telling two same-named songs apart, which it cannot.
 */
function slugify(title) {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const slugCandidates = (title) => [
  slugify(title),
  slugify(title.replace(/\s*\([^)]*\)\s*$/, "")),
];

/**
 * Check the spacing rules that keep a chord over the syllable it belongs to.
 *
 * Two shapes are mechanical enough to check, and both come straight from
 * songs/README.md:
 *
 *   `[Em]   [A7]`   chord, whitespace, chord    → one space per letter, plus one
 *   `[Em]·  · · ·`  chord, marker, whitespace   → one space per letter
 *
 * Everything else the spec describes — how much room a chord needs when there are
 * lyrics between it and the next one — depends on the words, and the spec says so
 * ("only applies when chords are close together"). Guessing at it would mean flagging
 * correct lines, so it is left to the eye.
 */
function checkSpacing(sheet, report) {
  // Kept as two patterns rather than one with an optional marker: an optional group
  // would happily match empty and let `[Dm]↓` be read as a bare chord followed by an
  // arrow, which is the same shape as a chord followed by a beat dot and is not.
  const adjacent = /\[([^\]]+)\]( *)(?=\[)/g;
  const afterMarker = new RegExp(
    `\\[([^\\]]+)\\]([${MARKERS}])( *)(?=[\\[${MARKERS}|])`,
    "g",
  );

  for (const { text, line } of sheet) {
    const complain = (whole, name, marker, spaces, want) => {
      if (spaces.length === want) return;
      report.warn(
        `spacing: \`${whole.replace(/ /g, "␣")}\` has ${spaces.length} space${
          spaces.length === 1 ? "" : "s"
        }, the rule for a ${name.length}-letter chord${
          marker ? ` after \`${marker}\`` : ""
        } is ${want}`,
        line,
      );
    };
    for (const [whole, name, spaces] of text.matchAll(adjacent)) {
      complain(whole, name, "", spaces, name.length + 1);
    }
    for (const [whole, name, marker, spaces] of text.matchAll(afterMarker)) {
      complain(whole, name, marker, spaces, name.length);
    }
  }
}

/**
 * Check the anticipations — the chords the cancionero prints in parentheses.
 *
 * `M2 · 8` settled what the mark means: the chord is optional or passing, and it sits
 * where the change actually starts rather than where the next line does. So a `(X)` is
 * the chord that follows it, printed a few syllables early. That held for 26 of 26
 * across the first 79 songs, without an exception. `DECISIONS.md` 9 in the vault.
 *
 * A mismatch is a **warning**, not an error. The rule is a pattern read off the book
 * rather than something the format imposes. What it catches meanwhile is the likelier
 * cause: an anticipation mistyped, or copied onto the wrong line.
 *
 * A parenthesis around anything that is not one of the song's own chords is left alone;
 * the book uses them for backing vocals and asides too.
 */
function checkAnticipations(sheet, defined, report) {
  sheet.forEach(({ text, line }, index) => {
    for (const m of text.matchAll(/\(([^()\s]+)\)/g)) {
      if (!defined.has(m[1])) continue;
      const after = [
        text.slice(m.index + m[0].length),
        ...sheet.slice(index + 1).map((rest) => rest.text),
      ];
      const next = /\[([^\]]+)\]/.exec(after.join("\n"));
      if (next?.[1] === m[1]) continue;
      report.warn(
        `\`(${m[1]})\` anticipates the chord after it, but the next one is ${
          next ? `\`[${next[1]}]\`` : "nothing"
        }`,
        line,
      );
    }
  });
}

/**
 * Check for characters that look Latin and are not.
 *
 * Three pages of the cancionero — 68, 187 and 236 — decoded with a Cyrillic е (U+0435)
 * inside an ordinary word, because the subset font mapped that glyph to the wrong code
 * point and its `/ToUnicode` table repeated the mistake.
 *
 * It is an **error** rather than a warning because nothing about it is visible. `Amorе`
 * renders exactly like `Amore` and never matches a search for it, which is how one sat
 * in `songs/volare.md` from `M2 · 5` until BUG-006 — past a byte-range `grep` that was
 * written to catch it and reported the file clean.
 *
 * The test is the whole Cyrillic block, not just `е`: any of it in a Spanish song is a
 * decoding fault, and naming the one letter would only ever catch the one page.
 */
function checkHomoglyphs(source, report) {
  source.split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(/[Ѐ-ӿ]/g)) {
      report.fail(
        `\`${m[0]}\` (U+${m[0].codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}) is Cyrillic — it looks Latin and never matches a search`,
        i + 1,
      );
    }
  });
}

/**
 * Check that every environment opened is closed, in order.
 *
 * A `{start_of_verse}` with no `{end_of_verse}` renders here — this app draws the
 * label and forgets the environment — and breaks in every other ChordPro tool,
 * which is precisely the failure the migration exists to stop. So it is checked
 * here rather than left to whoever compiles the file next.
 */
function checkEnvironments(directives, report) {
  const open = [];
  for (const { name, value, line } of directives) {
    if (name.startsWith("start_of_")) {
      if (open.length) {
        report.fail(
          `\`{${name}}\` opens inside \`{${open[open.length - 1].name}}\` — sections do not nest`,
          line,
        );
      }
      if (!value) {
        report.fail(
          `\`{${name}}\` has no label — the book prints a heading over every section`,
          line,
        );
      }
      open.push({ name, line });
      continue;
    }
    if (!name.startsWith("end_of_")) continue;

    const started = open.pop();
    const expected = started?.name.replace("start_of_", "end_of_");
    if (!started) {
      report.fail(`\`{${name}}\` closes a section that never opened`, line);
    } else if (expected !== name) {
      report.fail(`\`{${name}}\` closes a \`{${started.name}}\``, line);
    }
  }
  for (const { name, line } of open) {
    report.fail(`\`{${name}}\` is never closed`, line);
  }
}

/** Check one song file. Returns its errors and warnings. */
function checkSong(file) {
  const errors = [];
  const warnings = [];
  const at = (list) => (message, line) => list.push({ message, line });
  const report = { fail: at(errors), warn: at(warnings) };

  const source = fs.readFileSync(path.join(SONGS, file), "utf8");
  checkHomoglyphs(source, report);

  const { directives } = parseChordPro(source);

  /** The sheet, with the line number each line really has in the file. */
  const sheet = source
    .split(/\r?\n/)
    .map((text, index) => ({ text, line: index + 1 }))
    .filter(({ text }) => !isDirectiveLine(text));

  for (const { name, line } of directives) {
    if (!DIRECTIVES.has(name)) {
      report.fail(
        `\`{${name}}\` is not a directive this collection writes — see the list in scripts/validate-songs.mjs`,
        line,
      );
    }
  }

  const first = (name) => directives.find((d) => d.name === name);
  for (const name of REQUIRED) {
    if (!first(name)?.value)
      report.fail(`\`{${name}:}\` is missing or empty`, 1);
  }

  const year = first("year");
  if (year && !/^\d{4}$/.test(year.value)) {
    report.fail(
      `\`{year:}\` is \`${year.value}\`, which is not a four-digit year`,
      year.line,
    );
  }
  const time = first("time");
  if (time && !/^\d+\/\d+$/.test(time.value)) {
    report.fail(
      `\`{time:}\` is \`${time.value}\`, expected something like \`4/4\``,
      time.line,
    );
  }
  const capo = first("capo");
  if (capo && !/^\d+$/.test(capo.value)) {
    report.fail(
      `\`{capo:}\` is \`${capo.value}\`, expected a fret number`,
      capo.line,
    );
  }

  const title = first("title")?.value ?? "";
  const expected = slugCandidates(title);
  if (title && !expected.includes(file.slice(0, -SONG_EXTENSION.length))) {
    report.fail(
      `filename does not match the title — \`${title}\` should be \`${expected[1]}${SONG_EXTENSION}\``,
      first("title").line,
    );
  }

  checkEnvironments(directives, report);

  // A brace in the sheet is a directive the parser did not recognise as one —
  // a missing closing `}`, or a `{` inside a lyric. Nothing in the collection
  // has ever contained one, and either shape silently loses a line.
  for (const { text, line } of sheet) {
    if (/[{}]/.test(text)) {
      report.fail(
        "a `{` or `}` outside a directive — a directive on its own line, or nothing",
        line,
      );
    }
  }

  const defines = directives.filter((d) => d.name === "define");
  if (defines.length === 0)
    report.fail("no `{define:}` — a song draws its chords", 1);

  const seen = new Set();
  for (const directive of defines) {
    const chord = parseDefine(directive);
    if (!chord) {
      report.fail(
        `\`{define: ${directive.value}}\` is not \`<name> base-fret <n> frets <a> <b> <c> <d>\``,
        directive.line,
      );
      continue;
    }
    if (seen.has(chord.name)) {
      report.fail(`\`${chord.name}\` is defined twice`, chord.line);
    }
    seen.add(chord.name);

    const stopped = chord.positions
      .split("")
      .map(Number)
      .filter((f) => f > 0);
    if (stopped.length) {
      const span = Math.max(...stopped) - Math.min(...stopped) + 1;
      if (span > WINDOW_FRETS) {
        report.fail(
          `\`${chord.name}\` is \`${chord.positions}\`, which spans ${span} frets — ChordDiagram shows ${WINDOW_FRETS} at a time, so a finger would be missing from the diagram`,
          chord.line,
        );
      }
    }
  }

  const used = new Map();
  for (const { text, line } of sheet) {
    for (const m of text.matchAll(/\[([^\]]+)\]/g)) {
      if (!used.has(m[1])) used.set(m[1], line);
    }
  }
  for (const [name, line] of used) {
    if (!seen.has(name)) {
      report.fail(`\`[${name}]\` is used in the sheet but never defined`, line);
    }
  }
  for (const directive of defines) {
    const chord = parseDefine(directive);
    if (chord && !used.has(chord.name)) {
      report.warn(`\`${chord.name}\` is defined but never used`, chord.line);
    }
  }

  checkSpacing(sheet, report);
  checkAnticipations(sheet, seen, report);

  return { errors, warnings };
}

function main(argv) {
  const quiet = argv.includes("--quiet");
  if (!fs.existsSync(SONGS)) {
    console.error(`No songs directory at ${SONGS}`);
    return 1;
  }
  const files = fs
    .readdirSync(SONGS)
    .filter((f) => f.endsWith(SONG_EXTENSION))
    .sort();

  let errors = 0;
  let warnings = 0;
  for (const file of files) {
    const result = checkSong(file);
    errors += result.errors.length;
    warnings += result.warnings.length;
    if (result.errors.length === 0 && result.warnings.length === 0) {
      if (!quiet) console.log(`  ok    ${file}`);
      continue;
    }
    console.log(`  ${result.errors.length ? "FAIL" : "warn"}  ${file}`);
    for (const { message, line } of result.errors) {
      console.log(`          ${file}:${line}  ${message}`);
    }
    for (const { message, line } of result.warnings) {
      console.log(`          ${file}:${line}  ${message}`);
    }
  }

  console.log(
    `\n${files.length} song${files.length === 1 ? "" : "s"}, ` +
      `${errors} error${errors === 1 ? "" : "s"}, ` +
      `${warnings} warning${warnings === 1 ? "" : "s"}.`,
  );
  return errors === 0 ? 0 : 1;
}

process.exitCode = main(process.argv.slice(2));
