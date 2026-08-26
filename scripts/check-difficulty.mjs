#!/usr/bin/env node
/**
 * check-difficulty.mjs — the difficulty scale, checked over the whole
 * collection.
 *
 *   pnpm difficulty
 *
 * The subject is the band rule in `src/lib/difficulty.ts`, which is why this is
 * a fifth command beside `pnpm validate` (the song format), `pnpm credits` (the
 * attribution) and `pnpm transpose` (the transposer and its vocabulary) rather
 * than a new section of any of them.
 *
 * **It asserts the rule and only reports the data, and that split is the point.**
 * `pnpm transpose` asserts the collection's exact reach on purpose, so adding a
 * song to `songs/` is meant to fail it — one tripwire of that kind earns its
 * keep, and a second one failing on the same day for the same reason is noise
 * nobody reads. So nothing here fails because a song was added: the boundaries,
 * the totality and the monotonicity are asserted, and the distribution is
 * printed.
 *
 * **The boundaries are the whole risk.** Everything else in this milestone is a
 * chip and a class. An off-by-one at 5/6 moves 49 songs and one at 9/10 moves
 * 10, both look entirely correct in review, and nothing on screen would say so
 * — which is the shape of both defects M11 nearly shipped (vault DECISIONS.md
 * 21). So the checks sit *on* the boundary rather than in the middle of a band,
 * where any wrong rule still passes.
 *
 * Exits non-zero on any failure.
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
 * Import the app's own TypeScript rather than reimplementing it — a check that
 * reimplements what it checks proves the two agree and nothing about whether
 * either is right. The hook only resolves the `@/` alias Node does not read.
 *
 * **`format` is deliberately left unset**, unlike in `check-transpose.mjs`.
 * Naming it `"module"` tells Node the file is plain JavaScript and its type
 * stripping never runs, so the first aliased import of a file carrying a type
 * annotation dies on `Missing initializer in const declaration`. That script
 * gets away with it only because it imports `chords.ts` by file URL before
 * anything asks for `@/lib/chords`, so the cache is already warm — an ordering
 * accident, not a design. Leaving `format` out lets Node decide from the `.ts`
 * extension, which is what makes this hook work in any import order.
 */
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const target = path.join(REPO_ROOT, "src", specifier.slice(2));
      return {
        url: `${pathToFileURL(target).href}.ts`,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

const {
  DIFFICULTY_BANDS,
  FACIL_MAX_CHORDS,
  MEDIA_MAX_CHORDS,
  difficultyLabel,
  songDifficulty,
} = await import(
  pathToFileURL(path.join(REPO_ROOT, "src/lib/difficulty.ts")).href
);

const { buildChordVocabulary } = await import(
  pathToFileURL(path.join(REPO_ROOT, "src/lib/vocabulary.ts")).href
);
const { buildTranspositions } = await import(
  pathToFileURL(path.join(REPO_ROOT, "src/lib/transpose.ts")).href
);
const { stripVoicingMarker } = await import(
  pathToFileURL(path.join(REPO_ROOT, "src/lib/chords.ts")).href
);
const { INSTRUMENTS } = await import(
  pathToFileURL(path.join(REPO_ROOT, "src/lib/instrument.ts")).href
);
const { songFromChordPro } = await import(
  pathToFileURL(path.join(REPO_ROOT, "src/lib/songs.ts")).href
);

/* ------------------------------------------------------------------ songs */

const SONGS = path.join(REPO_ROOT, "songs");

const songs = fs
  .readdirSync(SONGS)
  .filter((file) => file.endsWith(".cho"))
  .sort()
  .map((file) =>
    songFromChordPro(
      fs.readFileSync(path.join(SONGS, file), "utf8"),
      file.replace(/\.cho$/, ""),
    ),
  );

/* ----------------------------------------------------------------- runner */

let failures = 0;
let checks = 0;

function check(label, fn) {
  checks++;
  try {
    const note = fn();
    console.log(`  ok    ${label}${note ? ` — ${note}` : ""}`);
  } catch (error) {
    failures++;
    console.log(`  FAIL  ${label}`);
    console.log(`        ${error.message.split("\n").join("\n        ")}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/* ------------------------------------------------------------- 1. the rule */

console.log("\nThe band rule");

check("every count from 0 to 60 gets a band", () => {
  const ids = new Set(DIFFICULTY_BANDS.map((band) => band.id));
  for (let n = 0; n <= 60; n++) {
    const band = songDifficulty(n);
    assert(
      ids.has(band),
      `${n} chords resolved to ${JSON.stringify(band)}, which is not a band`,
    );
  }
  return "61 counts, no gaps";
});

check("the bands never go backwards as the count rises", () => {
  // The rule is ordinal: more chords is never easier. A rule written with the
  // comparisons the wrong way round still passes a spot check in the middle of
  // a band and fails this.
  const order = DIFFICULTY_BANDS.map((band) => band.id);
  let previous = 0;
  for (let n = 0; n <= 60; n++) {
    const rank = order.indexOf(songDifficulty(n));
    assert(
      rank >= previous,
      `${n} chords is ${songDifficulty(n)}, easier than ${n - 1} chords`,
    );
    previous = rank;
  }
  return "monotonic over 0…60";
});

/*
 * The next two check literals — 5, 6, 9, 10 — and not `FACIL_MAX_CHORDS` and
 * `MEDIA_MAX_CHORDS`.
 *
 * **That is the whole point of them, and reading the constants would undo it.**
 * `songDifficulty(FACIL_MAX_CHORDS) === "facil"` is true for every value the
 * constant could ever hold: it restates the implementation and cannot fail. The
 * boundaries are Iker's decision, taken from the measured distribution on
 * 2026-08-02, so they are written here as the numbers he chose. Moving one now
 * fails this check, which is the tripwire — changing the scale has to be a
 * decision made twice, not an edit made once.
 *
 * This is M11's lesson arriving early rather than late: `M11 · 4`'s check was
 * itself wrong first, asserting a property nobody had measured, and a green
 * tick on an unmeasured property is worth less than no check at all because it
 * is believed.
 */

check("the first boundary is exactly where it was chosen", () => {
  assert(songDifficulty(5) === "facil", "5 chords should be the last fácil");
  assert(songDifficulty(6) === "media", "6 chords should be the first media");
  assert(
    FACIL_MAX_CHORDS === 5,
    `FACIL_MAX_CHORDS is ${FACIL_MAX_CHORDS}, and the boundary Iker chose is 5`,
  );
  return "5 fácil / 6 media";
});

check("the second boundary is exactly where it was chosen", () => {
  assert(songDifficulty(9) === "media", "9 chords should be the last media");
  assert(
    songDifficulty(10) === "dificil",
    "10 chords should be the first difícil",
  );
  assert(
    MEDIA_MAX_CHORDS === 9,
    `MEDIA_MAX_CHORDS is ${MEDIA_MAX_CHORDS}, and the boundary Iker chose is 9`,
  );
  return "9 media / 10 difícil";
});

check("every band has a label and the labels are distinct", () => {
  const labels = DIFFICULTY_BANDS.map((band) => difficultyLabel(band.id));
  assert(labels.every(Boolean), "a band has no label");
  assert(new Set(labels).size === labels.length, "two bands share a label");
  return labels.join(" · ");
});

/* -------------------------------------------------- 2. against the songs */

console.log("\nThe collection");

check("every song resolves to a band", () => {
  for (const song of songs) {
    const band = songDifficulty(song.chordDefinitions.length);
    assert(band, `${song.slug} has no band`);
  }
  return `${songs.length} songs`;
});

check("the count is the song's distinct chord list", () => {
  // The chip reads `metadata.chords.length`, so the frontmatter list has to be
  // distinct for the number to mean what the column says it means. A duplicate
  // name would inflate a song's difficulty silently.
  for (const song of songs) {
    const names = song.chordDefinitions.map((chord) => chord.name);
    assert(
      new Set(names).size === names.length,
      `${song.slug} lists a chord twice: ${names.join(", ")}`,
    );
  }
  return "no song lists a chord twice";
});

check("difficulty does not move when the key does", () => {
  // M11 transposes a song by remapping distinct chords to distinct chords, so
  // the count — and therefore the band — is the same in every key the app
  // offers. If this ever fails, the chip has to stop being derived from the
  // printed chord list, or transposition has started collapsing two chords into
  // one. Both are worth failing a build over.
  //
  // **Every instrument, because `buildTranspositions` takes a shape shift and
  // silently offered nothing without one.** This ran green over zero pairs from
  // M15 until BUG-016, which is why it did not notice the collapse below.
  //
  // **Two names for one chord are the one collapse there is, and it is
  // deliberate.** Where the book coined a second name for a second voicing —
  // `E²` beside `E` — the two are one chord anywhere but the page that drew
  // them (BUG-016), so a moved sheet holds one of it. `mi-cura-mi-enfermedad`
  // goes 10 to 9 and would cross a boundary if anything read that number, which
  // is why the band assertion below is scoped to the songs the collapse cannot
  // touch: the chip is `metadata.chords.length` in `SongList`, the printed
  // count, and no screen derives a band from a transposition at all.
  const vocabulary = buildChordVocabulary(songs);
  let pairs = 0;
  const collapsed = [];
  for (const song of songs) {
    const count = song.chordDefinitions.length;
    const printed = songDifficulty(count);
    const markers = song.chordDefinitions.filter(
      (chord) => stripVoicingMarker(chord.name) !== chord.name,
    ).length;

    for (const instrument of INSTRUMENTS) {
      for (const plan of buildTranspositions(
        song,
        vocabulary,
        instrument.shapeShift,
      )) {
        // `plan.chords` is every chord the song defines, moved — so its length
        // is what a sheet holds, and for a song with no second voicing it is
        // also exactly the printed count.
        assert(
          plan.chords.length === count ||
            (markers > 0 && plan.chords.length >= count - markers),
          `${song.slug} has ${count} chords as printed and ${plan.chords.length} in ${plan.key}`,
        );
        if (plan.chords.length !== count) collapsed.push(song.slug);
        else
          assert(
            songDifficulty(plan.chords.length) === printed,
            `${song.slug} is ${printed} as printed and ${songDifficulty(plan.chords.length)} in ${plan.key}`,
          );
        pairs++;
      }
    }
  }
  return (
    `${pairs} song-and-key pairs across ${INSTRUMENTS.length} instruments, ` +
    `none changed band — ${new Set(collapsed).size} songs fold a second ` +
    `voicing into its own chord away from their printed page`
  );
});

/* ---------------------------------------------- 3. the distribution, shown */

console.log("\nThe distribution — reported, and deliberately not asserted");

const histogram = new Map();
for (const song of songs) {
  const n = song.chordDefinitions.length;
  histogram.set(n, (histogram.get(n) ?? 0) + 1);
}

const perBand = new Map(DIFFICULTY_BANDS.map((band) => [band.id, 0]));
for (const song of songs) {
  const band = songDifficulty(song.chordDefinitions.length);
  perBand.set(band, perBand.get(band) + 1);
}

const counts = [...histogram.keys()].sort((a, b) => a - b);
console.log(`  chords  ${counts.map((n) => String(n).padStart(3)).join("")}`);
console.log(
  `  songs   ${counts.map((n) => String(histogram.get(n)).padStart(3)).join("")}`,
);
for (const band of DIFFICULTY_BANDS) {
  const n = perBand.get(band.id);
  console.log(
    `  ${band.label.padEnd(8)} ${String(n).padStart(3)} songs  ${((100 * n) / songs.length).toFixed(1)}%`,
  );
}

const sorted = songs
  .map((song) => ({ slug: song.slug, n: song.chordDefinitions.length }))
  .sort((a, b) => a.n - b.n);
const total = sorted.reduce((sum, song) => sum + song.n, 0);
console.log(
  `  fewest ${sorted[0].n} (${sorted[0].slug}) · most ${sorted[sorted.length - 1].n} (${sorted[sorted.length - 1].slug}) · median ${sorted[Math.floor(sorted.length / 2)].n} · mean ${(total / sorted.length).toFixed(2)}`,
);

/* -------------------------------------------------------------- the tail */

console.log(
  `\n${checks - failures}/${checks} checks passed` +
    (failures ? ` — ${failures} FAILED` : ""),
);
process.exit(failures ? 1 : 0);
