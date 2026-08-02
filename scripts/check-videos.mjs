#!/usr/bin/env node
/**
 * check-videos.mjs — the reference recordings, checked against the collection.
 *
 *   pnpm videos
 *
 * The subject is `data/videos.json`, which is why this is a sixth command beside
 * `pnpm validate` (the song format), `pnpm credits` (the attribution),
 * `pnpm transpose` (the transposer and its vocabulary) and `pnpm difficulty`
 * (the band rule) rather than a new section of any of them.
 *
 * ## What a check can prove here is narrow, and saying so is the point
 *
 * It can prove an ID is well-formed, that its slug is a real song, that no two
 * songs claim one recording, and that every entry carries the evidence a person
 * needs to review it. **It cannot prove the video is this song.** No assertion
 * here reaches YouTube, and one that did would be a network call in a check
 * script that goes stale the first time an upload is taken down. `M14 · 5` is
 * the rest of it, and the four fields this file insists on are what make that
 * review a read of one file rather than 276 videos.
 *
 * So the last assertion below is the load-bearing one: an ID with no title and
 * channel beside it is not a weaker entry, it is a claim with nothing behind it,
 * and it makes the only check that could ever catch a wrong video impossible one
 * entry at a time.
 *
 * ## Coverage is reported, never asserted
 *
 * That is `pnpm difficulty`'s shape rather than `pnpm transpose`'s, and the
 * difference is whether a failure means a defect. The transposer asserts the
 * collection's reach exactly *because* adding a song is meant to fail it — the
 * reach changed and the numbers need re-reading. A video count moves whenever
 * anyone adds one entry, on purpose, and a check that fails for a reason that is
 * not a defect gets deleted inside a month.
 *
 * ## It runs in `pnpm build`, and that is a departure worth its reason
 *
 * Until now only `pnpm credits` did, because there is no CI here and the credit
 * is the one thing this project is not free to lose. The test for joining it is
 * whether the check can fail for a reason that is *not* a defect, and this one
 * cannot: adding a song does not fail it, and every assertion below fails only on
 * a genuine error. `data/videos.json` is also the one file here that is expected
 * to be **edited by hand** after it is written — a wrong match is a one-line fix
 * and a deploy — and a hand edit is exactly the moment nobody remembers to run a
 * separate command. It runs *before* `next build` rather than after, because it
 * needs nothing built and there is no reason to spend a build finding a typo.
 *
 * Exits non-zero on any failure.
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
const MAP = path.join(REPO_ROOT, "data", "videos.json");

/** A YouTube video ID: eleven characters, and only these. */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** `m:ss` or `mm:ss`. The seconds are checked separately — `9:87` matches this. */
const DURATION = /^(\d{1,2}):(\d{2})$/;

/** Exactly these four fields, and no others. See `data/README.md`. */
const FIELDS = ["id", "title", "channel", "duration"];

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

/**
 * Report every offender rather than the first.
 *
 * A map with nine bad entries fixed one run at a time is nine runs, and the
 * ninth is the one where somebody stops reading the output.
 */
function assertNone(offenders, describe) {
  if (offenders.length === 0) return;
  throw new Error(
    `${offenders.length}:\n${offenders.map(describe).join("\n")}`,
  );
}

/* ------------------------------------------------------------------- input */

const songSlugs = new Set(
  fs
    .readdirSync(SONGS)
    .filter((file) => file.endsWith(".md") && file !== "README.md")
    .map((file) => file.replace(/\.md$/, "")),
);

assert(fs.existsSync(MAP), `data/videos.json is missing (looked in ${MAP})`);

let map;
try {
  map = JSON.parse(fs.readFileSync(MAP, "utf8"));
} catch (error) {
  console.error(`\ndata/videos.json is not valid JSON: ${error.message}\n`);
  process.exit(1);
}

const entries = Object.entries(map);

console.log(
  `\nChecking ${entries.length} reference${entries.length === 1 ? "" : "s"} against ${songSlugs.size} songs`,
);

/* -------------------------------------------------------------- the checks */

console.log("\nThe map");

check("every slug in the map is a song in songs/", () => {
  // A renamed or deleted song leaves an entry pointing at nothing, and nothing
  // on any screen would say so: `getSongVideo` would simply never be asked for
  // it, so the reference would sit in the file looking reviewed for ever.
  assertNone(
    entries.filter(([slug]) => !songSlugs.has(slug)),
    ([slug]) => `          ${slug} — no songs/${slug}.md`,
  );
  return `${entries.length} slugs`;
});

check("every ID is a well-formed YouTube video ID", () => {
  assertNone(
    entries.filter(([, entry]) => !VIDEO_ID.test(String(entry?.id ?? ""))),
    ([slug, entry]) => `          ${slug} — ${JSON.stringify(entry?.id)}`,
  );
  return "11 characters of [A-Za-z0-9_-]";
});

check("no two songs claim the same recording", () => {
  // Either a duplicate in the book or a bad match, and both want looking at —
  // the second is the dangerous one, because one generic upload matched to
  // twenty songs looks exactly like twenty good matches on every screen.
  const byId = new Map();
  for (const [slug, entry] of entries) {
    const held = byId.get(entry?.id) ?? [];
    held.push(slug);
    byId.set(entry?.id, held);
  }

  assertNone(
    [...byId.entries()].filter(([, slugs]) => slugs.length > 1),
    ([id, slugs]) => `          ${id} — ${slugs.join(", ")}`,
  );
  return `${byId.size} distinct recordings`;
});

check("every entry carries the evidence it was matched on", () => {
  // The load-bearing one. `M14 · 4` cannot tell a right video from a plausible
  // one and no check can; what makes `M14 · 5` affordable is that a title, a
  // channel and a duration can be *read*. An ID on its own cannot be reviewed
  // at all, so an entry missing them is worse than no entry.
  assertNone(
    entries.filter(([, entry]) => {
      const keys = Object.keys(entry ?? {}).sort();
      if (keys.join() !== [...FIELDS].sort().join()) return true;
      return ["title", "channel"].some(
        (field) => String(entry[field] ?? "").trim() === "",
      );
    }),
    ([slug, entry]) =>
      `          ${slug} — has ${JSON.stringify(Object.keys(entry ?? {}))}, wants ${JSON.stringify(FIELDS)} all non-empty`,
  );
  return FIELDS.join(", ");
});

check("every duration is a plausible m:ss", () => {
  assertNone(
    entries.filter(([, entry]) => {
      const match = DURATION.exec(String(entry?.duration ?? ""));
      return !match || Number(match[2]) > 59;
    }),
    ([slug, entry]) => `          ${slug} — ${JSON.stringify(entry?.duration)}`,
  );
  return "m:ss or mm:ss, seconds under 60";
});

/* ------------------------------------------------------------ the reporting */

console.log("\nCoverage — reported, not asserted");

const withVideo = entries.filter(([slug]) => songSlugs.has(slug)).length;
const missing = [...songSlugs].filter((slug) => !(slug in map)).sort();

console.log(
  `  ${withVideo} of ${songSlugs.size} songs have a reference (${Math.round((withVideo / songSlugs.size) * 100)}%)`,
);
console.log(`  ${missing.length} have none, and show no panel at all`);

// Printed in full rather than counted. This list is what a later pass picks up,
// and a number nobody can act on is not a report.
if (missing.length > 0) {
  console.log("\n  Songs with no reference:");
  for (const slug of missing) console.log(`    ${slug}`);
}

const topic = entries.filter(([, entry]) =>
  / - Topic$/.test(String(entry?.channel ?? "")),
).length;
console.log(
  `\n  ${topic} of ${entries.length} are on a YouTube auto-generated artist channel`,
);

/* ------------------------------------------------------------------ verdict */

console.log(
  `\n${checks - failures}/${checks} checks passed${failures ? ` — ${failures} FAILED` : ""}\n`,
);

process.exit(failures > 0 ? 1 : 0);
