#!/usr/bin/env node
/**
 * validate-songs.mjs — check every file in songs/ against the format spec.
 *
 *   pnpm validate            check songs/
 *   pnpm validate --quiet    print only what is wrong
 *
 * The rules are the ones written down in songs/README.md and CLAUDE.md. They were
 * enforced by whoever was paying attention, which was fine for thirteen songs and is not
 * fine for two hundred and seventy-six. This turns the prose into a command.
 *
 * Exits non-zero when anything is an error. Warnings never fail the run: they mark
 * things worth a look that are not wrong on their own.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
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

/** Split a song file into its frontmatter block and its body. */
function split(source) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source);
  return m ? { frontmatter: m[1], body: m[2] } : null;
}

/**
 * Read the frontmatter.
 *
 * This is not a YAML parser and does not want to be: the frontmatter is four scalars
 * and a list of chord pairs, and the point is to see the file the way a reader will,
 * with line numbers to report against.
 */
function readFrontmatter(frontmatter) {
  const scalars = {};
  const chords = [];
  let inChords = false;
  const lines = frontmatter.split(/\r?\n/);
  lines.forEach((line, i) => {
    const lineNo = i + 2; // the opening `---` is line 1
    if (/^chords:\s*$/.test(line)) {
      inChords = true;
      return;
    }
    if (inChords) {
      const name = /^\s*-\s*name:\s*(.+?)\s*$/.exec(line);
      if (name) {
        chords.push({ name: name[1].replace(/^"(.*)"$/, "$1"), line: lineNo });
        return;
      }
      const positions = /^\s*positions:\s*(.+?)\s*$/.exec(line);
      if (positions && chords.length) {
        chords[chords.length - 1].positions = positions[1].replace(
          /^"(.*)"$/,
          "$1",
        );
        return;
      }
      if (line.trim() !== "") inChords = false;
    }
    const scalar = /^([A-Za-z][\w]*):\s*(.*)$/.exec(line);
    if (scalar) scalars[scalar[1]] = { value: scalar[2].trim(), line: lineNo };
  });
  return { scalars, chords };
}

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
function checkSpacing(body, report) {
  // Kept as two patterns rather than one with an optional marker: an optional group
  // would happily match empty and let `[Dm]↓` be read as a bare chord followed by an
  // arrow, which is the same shape as a chord followed by a beat dot and is not.
  const adjacent = /\[([^\]]+)\]( *)(?=\[)/g;
  const afterMarker = new RegExp(
    `\\[([^\\]]+)\\]([${MARKERS}])( *)(?=[\\[${MARKERS}|])`,
    "g",
  );

  body.split(/\r?\n/).forEach((line, index) => {
    const complain = (whole, name, marker, spaces, want) => {
      if (spaces.length === want) return;
      report.warn(
        `spacing: \`${whole.replace(/ /g, "␣")}\` has ${spaces.length} space${
          spaces.length === 1 ? "" : "s"
        }, the rule for a ${name.length}-letter chord${
          marker ? ` after \`${marker}\`` : ""
        } is ${want}`,
        index,
      );
    };
    for (const [whole, name, spaces] of line.matchAll(adjacent)) {
      complain(whole, name, "", spaces, name.length + 1);
    }
    for (const [whole, name, marker, spaces] of line.matchAll(afterMarker)) {
      complain(whole, name, marker, spaces, name.length);
    }
  });
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
 * rather than something the format imposes, and 38 pages carrying the mark are still
 * untranscribed — one of them is allowed to surprise us. What it catches meanwhile is
 * the likelier cause: an anticipation mistyped, or copied onto the wrong line.
 *
 * A parenthesis around anything that is not one of the song's own chords is left alone;
 * the book uses them for backing vocals and asides too, as `(Cuidado, mucho cuidado)`
 * in `colgando-en-tus-manos.md` does.
 */
function checkAnticipations(body, defined, report) {
  const lines = body.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const m of line.matchAll(/\(([^()\s]+)\)/g)) {
      if (!defined.has(m[1])) continue;
      const after = [
        line.slice(m.index + m[0].length),
        ...lines.slice(index + 1),
      ];
      const next = /\[([^\]]+)\]/.exec(after.join("\n"));
      if (next?.[1] === m[1]) continue;
      report.warn(
        `\`(${m[1]})\` anticipates the chord after it, but the next one is ${
          next ? `\`[${next[1]}]\`` : "nothing"
        }`,
        index,
      );
    }
  });
}

/** Check one song file. Returns its errors and warnings. */
function checkSong(file) {
  const errors = [];
  const warnings = [];
  const at = (list) => (message, line) => list.push({ message, line });
  const report = { fail: at(errors), warn: at(warnings) };

  const source = fs.readFileSync(path.join(SONGS, file), "utf8");
  const parts = split(source);
  if (!parts) {
    report.fail("no frontmatter — a song starts with a `---` block", 1);
    return { errors, warnings };
  }

  const { scalars, chords } = readFrontmatter(parts.frontmatter);

  for (const key of ["title", "artist", "key", "timeSignature"]) {
    if (!scalars[key]?.value) report.fail(`\`${key}\` is missing or empty`, 1);
  }
  if (scalars.year && !/^\d{4}$/.test(scalars.year.value)) {
    report.fail(
      `\`year\` is \`${scalars.year.value}\`, which is not a four-digit year`,
      scalars.year.line,
    );
  }
  if (
    scalars.timeSignature &&
    !/^\d+\/\d+$/.test(scalars.timeSignature.value)
  ) {
    report.fail(
      `\`timeSignature\` is \`${scalars.timeSignature.value}\`, expected something like \`4/4\``,
      scalars.timeSignature.line,
    );
  }

  const title = scalars.title?.value ?? "";
  const expected = slugCandidates(title);
  if (title && !expected.includes(file.replace(/\.md$/, ""))) {
    report.fail(
      `filename does not match the title — \`${title}\` should be \`${expected[1]}.md\``,
      scalars.title.line,
    );
  }

  if (chords.length === 0)
    report.fail("no chords defined in the frontmatter", 1);
  const seen = new Set();
  for (const chord of chords) {
    if (seen.has(chord.name)) {
      report.fail(`\`${chord.name}\` is defined twice`, chord.line);
    }
    seen.add(chord.name);
    if (chord.positions === undefined) {
      report.fail(`\`${chord.name}\` has no \`positions\``, chord.line);
      continue;
    }
    if (!/^\d{4}$/.test(chord.positions)) {
      report.fail(
        `\`${chord.name}\` has positions \`${chord.positions}\` — it must be exactly four digits, one per string, GCEA`,
        chord.line,
      );
      continue;
    }
    const stopped = chord.positions
      .split("")
      .map(Number)
      .filter((fret) => fret > 0);
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

  // Body line 1 sits after the opening `---`, the frontmatter, and the closing `---`.
  const bodyLine = (index) =>
    parts.frontmatter.split(/\r?\n/).length + 3 + index;
  const used = new Map();
  parts.body.split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(/\[([^\]]+)\]/g)) {
      if (!used.has(m[1])) used.set(m[1], bodyLine(i));
    }
  });
  for (const [name, line] of used) {
    if (!seen.has(name)) {
      report.fail(
        `\`[${name}]\` is used in the lyrics but never defined`,
        line,
      );
    }
  }
  for (const chord of chords) {
    if (!used.has(chord.name)) {
      report.warn(`\`${chord.name}\` is defined but never used`, chord.line);
    }
  }

  const relay = {
    fail: (m, i) => report.fail(m, bodyLine(i)),
    warn: (m, i) => report.warn(m, bodyLine(i)),
  };
  checkSpacing(parts.body, relay);
  checkAnticipations(parts.body, seen, relay);

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
    .filter((f) => f.endsWith(".md") && f !== "README.md")
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
