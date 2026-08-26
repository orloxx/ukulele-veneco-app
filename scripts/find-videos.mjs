#!/usr/bin/env node
/**
 * find-videos.mjs — a reference recording for every song the search will stand
 * behind, and nothing for the rest.
 *
 *   node scripts/find-videos.mjs                 all 276, writes data/videos.json
 *   node scripts/find-videos.mjs --only <slug>   one song, prints, writes nothing
 *   node scripts/find-videos.mjs --pilot         the hand-picked ten, writes nothing
 *   node scripts/find-videos.mjs --rescore       re-apply the rule to the cache
 *   node scripts/find-videos.mjs --verbose       print every candidate and its verdict
 *
 * **This is not a check and is never run by anything.** It writes
 * `data/videos.json` once, a person reads what it wrote (`M14 · 5`), and after
 * that the file is edited by hand. `pnpm videos` is the check; see
 * `scripts/check-videos.mjs`.
 *
 * ## The tool is yt-dlp, and the alternative was weighed rather than skipped
 *
 * The YouTube Data API v3 is the official route and it is the wrong one here.
 * `search.list` costs **100 of the 10,000 free daily units**, so 276 songs is a
 * three-day job spread over three quota windows, and it needs a Google Cloud
 * project and a key that then has to live somewhere. `yt-dlp` needs neither, has
 * no quota, returns the title, channel, duration, view count and verification
 * badge in one JSON, and is a `brew install`. The whole of what this project
 * gets from the official API is a support commitment for a script that runs
 * once.
 *
 * ## The acceptance rule, written down before it was ever run
 *
 * The interesting half of this script is the **refusal**. An accept-anything
 * matcher returns 276 videos and some unknown number of them are the wrong song,
 * which is worse than an absent panel because it is invisible until somebody
 * plays one — and `M14 · 4` cannot see it, because no check reaches YouTube. So
 * a candidate is accepted only if **all five** hold — four written before it was
 * ever run, and the fifth added when the collection showed what they had all
 * missed:
 *
 * 1. **It is a recording of a song.** `MIN_SECONDS` ≤ duration ≤ `MAX_SECONDS`.
 *    Below the floor is a clip, a short or a fragment; above the ceiling is a
 *    mix, a full album upload, a concert or a documentary. Anything live-now or
 *    upcoming is out regardless of what its duration says.
 * 2. **The video's title carries the song's title**, folded — accents stripped,
 *    case dropped, punctuation collapsed. This is the strong signal and it is
 *    also the one that is not enough on its own: `Luna`, `Tú` and `Dime` are
 *    songs in this collection and phrases in Spanish.
 * 3. **The artist appears**, in the video's title or in the channel's name, on
 *    the same folding. Rule 2 says it might be the song; rule 3 is what makes it
 *    this one. A credit is split on commas and on *y*, so
 *    `Carota, Ñema y Tajá` matches on any of its three names, and a part shorter
 *    than `MIN_CREDIT_CHARS` is dropped rather than matched — `y` and `los` are
 *    in half the channel names on YouTube.
 * 4. **No other song has already claimed it.** Two slugs pointing at one
 *    recording is either a duplicate in the book or a bad match; `pnpm videos`
 *    fails on it, so it is resolved here by keeping the better-scoring song and
 *    declining the other **with the reason recorded**, rather than by shipping a
 *    map that cannot pass its own check.
 * 5. **It is a recording rather than a lesson about one.** See
 *    `NOT_A_RECORDING`. This clause is the one thing the collection added to the
 *    rule after it had been written and the pilot ten had passed it, and it is
 *    left labelled rather than folded in with the others: the rule as first
 *    written had no opinion at all about a video that is the right song, by the
 *    right artist, on the artist's own channel, and is a guitar lesson.
 *
 * Among the candidates that pass, the winner is the highest score, and the score
 * is deliberately crude: an artist's own channel is worth more than any number
 * of views, because the failure being guarded against is a plausible wrong video
 * and a wrong video on the artist's own channel is close to impossible.
 *
 * **Nothing here is a similarity threshold.** A percentage would have to be
 * tuned, and tuning it against the collection is how a rule ends up fitted to
 * the songs it was tested on. Every rule above is a yes or a no.
 */

import { execFile } from "node:child_process";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const SONGS = path.join(REPO_ROOT, "songs");
const OUTPUT = path.join(REPO_ROOT, "data", "videos.json");

/** Read `songs/` with the app's own reader; the hook only resolves `@/`. */
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const target = path.join(REPO_ROOT, "src", specifier.slice(2));
      return { url: `${pathToFileURL(target).href}.ts`, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const { songFromChordPro } = await import("@/lib/songs");

/**
 * The raw search results, kept so the rule can be re-applied without asking
 * YouTube 276 more questions.
 *
 * It is gitignored. It is a cache of somebody else's data and it goes stale;
 * the file that is the record is `data/videos.json`, and it holds the four
 * fields a person needs rather than everything the search returned.
 */
const CACHE = path.join(REPO_ROOT, "scripts", ".videos-cache.json");

/* ------------------------------------------------------- the rule's numbers */

/** Under this is a clip, a short or a fragment, not a song. */
const MIN_SECONDS = 75;

/**
 * Over this is a mix, an album, a concert or a documentary.
 *
 * 13 minutes is generous for a song and is meant to be: the collection carries
 * joropos and a couple of long suites, and the failure this bound exists to
 * catch — a 90-minute *"lo mejor de la música venezolana"* upload — is nowhere
 * near it. A tight bound would decline real songs to catch nothing extra.
 */
const MAX_SECONDS = 780;

/** A credit fragment shorter than this matches by accident, not by name. */
const MIN_CREDIT_CHARS = 4;

/**
 * Words that say a video is *about* the song rather than *of* it.
 *
 * **This is the clause the pilot could not have produced**, and it is worth
 * saying so plainly rather than presenting the rule as though it arrived whole.
 * The ten hand-picked songs were chosen for the ways the *match* could fail —
 * a common phrase for a title, a credit with three names in it, one song printed
 * on two pages — and every one of them passed. What the 276 turned up is a
 * different failure entirely: a candidate that is the right song, by the right
 * artist, on the right artist's own channel, and is an eleven-minute guitar
 * lesson. `cancion-para-ti` matched *Frank Quintero — Tutoriales de Guitarra*,
 * and nothing in rules 1 to 3 has an opinion about it.
 *
 * They are matched as **whole words**, which is not fussiness: `pista` inside
 * `Autopista Sur Oficial` is a substring and not a marker, and the substring
 * version declined a correct match for `caracas-se-quema`.
 */
const NOT_A_RECORDING = [
  "tutorial",
  "tutoriales",
  "karaoke",
  "pista",
  "pistas",
  "remix",
  "club mix",
  "acordes",
  "como tocar",
  "leccion",
  "lecciones",
  "backing track",
];

/**
 * `cover` is not on that list, and the reason is a real match it would have
 * cost.
 *
 * On YouTube it means two unrelated things: somebody else playing the song, and
 * *cover audio* — the album artwork with the record over it, which is how half
 * the industry uploads its own back catalogue. Ricardo Montaner's own channel
 * carries `Tan Enamorados con la London Metropolitan Orchestra (Cover Audio)`,
 * which is him, and rejecting the word outright throws it away.
 *
 * Which one it means is decided by *whose channel it is on*, so that is what is
 * checked. Rule 3 already keeps most third-party covers out — a cover by
 * somebody else is on somebody else's channel — and this catches the rest, the
 * ones that put the original artist's name in the title.
 */
const COVER = ["cover", "covers"];

/** How many results to ask for. Past this the search is answering a different question. */
const SEARCH_RESULTS = 10;

/** Searches in flight. Enough to finish in minutes, few enough not to be rude. */
const CONCURRENCY = 4;

/**
 * The ten the rule was tried on before it was let near the collection.
 *
 * Picked for the ways it could fail rather than for coverage: the most-printed
 * artist in the book, two bands with a single entry, two titles that are
 * ordinary Spanish phrases, the one song with no year, the two pages of one song
 * that the duplicate rule has to separate, and a title whose parenthetical is
 * the book disambiguating rather than part of the name.
 */
const PILOT = [
  "caballo-viejo",
  "tonada-de-luna-llena",
  "luna",
  "dime",
  "de-contento",
  "sin-sombra-no-hay-luz-gm",
  "sin-sombra-no-hay-luz-am",
  "barlovento",
  "el-burrito-de-belen",
  "muera-el-amor",
];

/* ----------------------------------------------------------------- folding */

/**
 * The comparison form: lower case, no accents, nothing but letters, digits and
 * single spaces.
 *
 * The same idea as `foldForSearch` in `FilterCombobox`, and deliberately not an
 * import of it — that one is a browser module the app ships, this is a script
 * that runs once, and the two are allowed to disagree because they are answering
 * questions about different things. What is shared is the reason: `Ñema` and
 * `Nema` are the same word to everybody except a string comparison.
 */
function fold(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * The song's title with the book's own disambiguating parenthetical dropped.
 *
 * `Sin sombra no hay luz (Gm)` is one song printed twice in two keys and the key
 * is not part of its name; `El burrito de Belén (El burrito sabanero)` carries
 * the name it is better known by. Both search better without the brackets, and
 * matching accepts either form.
 */
function bareTitle(title) {
  return title.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

/**
 * A YouTube auto-generated artist channel.
 *
 * These are not uploaded by anyone: YouTube creates `<artist> - Topic` from a
 * licensed distribution feed, so the suffix is the one signal in a search result
 * that no human chose to put there. It is checked on the raw channel name and
 * not on the folded one, because folding strips the hyphen that makes it a
 * suffix rather than a phrase.
 */
function isTopicChannel(channel) {
  return / - Topic$/.test(String(channel ?? ""));
}

/** Whether a folded string contains `phrase` as whole words. */
function hasPhrase(folded, phrase) {
  return ` ${folded} `.includes(` ${phrase} `);
}

/** The names inside one credit, long enough to mean something. */
function creditParts(artist) {
  return [artist, ...artist.split(/,| y | & /i)]
    .map((part) => fold(part))
    .filter((part) => part.length >= MIN_CREDIT_CHARS);
}

/* ------------------------------------------------------------------- songs */

function loadSongs() {
  return fs
    .readdirSync(SONGS)
    .filter((file) => file.endsWith(".cho"))
    .sort()
    .map((file) => {
      const { slug, metadata } = songFromChordPro(
        fs.readFileSync(path.join(SONGS, file), "utf8"),
        file.replace(/\.cho$/, ""),
      );
      return {
        slug,
        title: metadata.title,
        artist: metadata.artist,
        year: metadata.year,
      };
    });
}

/* ------------------------------------------------------------------ search */

/**
 * Ask YouTube, and hand back whatever it says without judging it.
 *
 * The query is title + artist and never the year: 275 of 276 songs carry one,
 * and a year in a YouTube query matches an upload date and a "(1978)" in
 * somebody's title far more often than it matches the recording. It stays as a
 * tiebreak for a person reading the map, which is where it is useful.
 */
async function search(song, attempt = 1) {
  const query = `${bareTitle(song.title)} ${song.artist}`;

  try {
    const { stdout } = await execFileAsync(
      "yt-dlp",
      [
        "--flat-playlist",
        "--dump-json",
        "--no-warnings",
        "--ignore-errors",
        `ytsearch${SEARCH_RESULTS}:${query}`,
      ],
      { maxBuffer: 32 * 1024 * 1024 },
    );

    return stdout
      .split("\n")
      .filter((line) => line.trim().startsWith("{"))
      .map((line) => JSON.parse(line))
      .map((entry) => ({
        id: entry.id,
        title: entry.title ?? "",
        channel: entry.channel ?? entry.uploader ?? "",
        duration: entry.duration ?? null,
        durationString: entry.duration_string ?? null,
        views: entry.view_count ?? 0,
        verified: Boolean(entry.channel_is_verified),
        liveStatus: entry.live_status ?? null,
      }));
  } catch (error) {
    // One retry, then the song is simply not searched — which shows up as a
    // decline with its own reason rather than as a crash 200 songs in.
    if (attempt < 2) return search(song, attempt + 1);
    console.error(`  ! ${song.slug}: ${error.message.split("\n")[0]}`);
    return null;
  }
}

/* ------------------------------------------------------------------ the rule */

/** `m:ss`, from seconds, when yt-dlp did not already say it. */
function formatDuration(seconds) {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/**
 * Rules 1 to 3, and a score for the ones that survive.
 *
 * Returns `{ ok: false, why }` or `{ ok: true, score, why }`. The `why` is kept
 * either way: `--verbose` prints it, and a decline nobody can read is a result
 * nobody can act on.
 */
function judge(song, candidate) {
  if (
    candidate.liveStatus === "is_live" ||
    candidate.liveStatus === "is_upcoming"
  ) {
    return { ok: false, why: "live or upcoming" };
  }

  const seconds = candidate.duration;
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
    return { ok: false, why: "no duration" };
  }
  if (seconds < MIN_SECONDS)
    return { ok: false, why: `too short (${seconds}s)` };
  if (seconds > MAX_SECONDS)
    return { ok: false, why: `too long (${seconds}s)` };

  const videoTitle = fold(candidate.title);
  const channel = fold(candidate.channel);

  const wanted = [fold(song.title), fold(bareTitle(song.title))];
  if (!wanted.some((form) => form && videoTitle.includes(form))) {
    return { ok: false, why: "title not in the video's title" };
  }

  const credits = creditParts(song.artist);
  const inTitle = credits.some((part) => videoTitle.includes(part));
  const onChannel = credits.some(
    (part) => channel.includes(part) || part.includes(channel),
  );
  if (!inTitle && !onChannel) {
    return { ok: false, why: "artist in neither the title nor the channel" };
  }

  // Rule 5: the right song, by the right artist, and not a recording of it.
  const marker = NOT_A_RECORDING.find(
    (word) => hasPhrase(videoTitle, word) || hasPhrase(channel, word),
  );
  if (marker) return { ok: false, why: `"${marker}" — not a recording` };

  // `cover` on somebody else's channel is somebody else playing it; on the
  // artist's own it is the album artwork. See COVER.
  if (!onChannel && COVER.some((word) => hasPhrase(videoTitle, word))) {
    return { ok: false, why: "a cover, on a channel that is not the artist's" };
  }

  // Crude on purpose. The artist's own channel outweighs everything else,
  // because the failure being guarded against is a plausible wrong video and a
  // wrong video on the artist's own channel is close to impossible. Views are
  // the tiebreak and never the argument — the most-watched result for a
  // Venezuelan standard is very often a cover.
  //
  // **The `- Topic` term is the one thing the pilot changed**, and it changed
  // the ranking rather than the rule: nothing that was accepted became rejected.
  // YouTube generates a `<artist> - Topic` channel from licensed distribution
  // and from nothing else, so it is the one signal here that a human did not
  // type. Without it `muera-el-amor` went to a devoted fan channel — a correct
  // match, and beating Mirla Castellanos's own audio only because the fan had
  // put her name in the video's title and the official upload had not.
  // **`inTitle` is the term BUG-018 landed on, and it is left as it is on
  // purpose.** Once `onChannel` holds, the artist is already established, so the
  // +100 is the same evidence counted twice — and because views are capped at
  // +40 it *decides* between candidates on the artist's own channel. Both bugs
  // are that: the band's own upload titled `CDC - Las Estrellas` scores 1084 and
  // loses to a later re-upload titled `Caramelos de Cianuro - Las Estrellas` at
  // 1175, which spells the name out and has 62× fewer views.
  //
  // Making it `inTitle && !onChannel` was measured against the cache rather than
  // argued: it re-picks exactly the two videos Iker corrected by hand, **and
  // seven others nobody has reviewed** — trading `Noche de Copas (Official Video
  // 1984)` for an untitled upload a quarter-minute longer, among others. Two
  // fixed and seven gambled is the wrong trade in a project where only a person
  // can tell a right video from a plausible one, so the entries were corrected
  // and the rule was not. If this is ever reopened, the seven are the work.
  let score = 0;
  if (onChannel) score += 1000;
  if (isTopicChannel(candidate.channel)) score += 500;
  if (inTitle) score += 100;
  if (candidate.verified) score += 50;
  score += Math.min(40, Math.log10(Math.max(candidate.views, 1)) * 5);

  return {
    ok: true,
    score,
    why: onChannel ? "artist's channel" : "artist in the title",
  };
}

/* ------------------------------------------------------------------- report */

function pick(song, candidates, verbose) {
  const judged = candidates.map((candidate) => ({
    candidate,
    verdict: judge(song, candidate),
  }));

  if (verbose) {
    console.log(`\n  ${song.slug} — "${song.title}" · ${song.artist}`);
    for (const { candidate, verdict } of judged) {
      const mark = verdict.ok ? `+${Math.round(verdict.score)}` : "  · ";
      console.log(
        `    ${mark} ${candidate.durationString ?? "?"} ${candidate.channel} — ${candidate.title} [${verdict.why}]`,
      );
    }
  }

  const accepted = judged
    .filter(({ verdict }) => verdict.ok)
    .sort((a, b) => b.verdict.score - a.verdict.score);

  return accepted[0] ?? null;
}

/** Run `worker` over `items`, `CONCURRENCY` at a time, in order. */
async function pool(items, worker) {
  const results = new Array(items.length);
  let next = 0;

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await worker(items[index], index);
      }
    }),
  );

  return results;
}

/* --------------------------------------------------------------------- main */

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name) => {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
};

const verbose = flag("--verbose");
const only = value("--only");
const isPilot = flag("--pilot");
const rescore = flag("--rescore");
const overwrite = flag("--overwrite");
const writes = !only && !isPilot;

// BUG-018. This script wrote `data/videos.json` once, and since then the file
// has been corrected by hand — the reader is the whole verification mechanism
// (`data/README.md`), so a hand edit is the *better* record and this script's
// output is the weaker one. A bare re-run rewrites all 261 entries from the
// rule, silently reverting every correction, and nothing on any screen would
// say so: the panel would go back to naming a plausible video with the right
// title on the right channel. Measured after BUG-018 — a re-run reproduces both
// wrong matches exactly.
//
// So writing over an existing map is the one thing that needs saying out loud
// rather than the default. Regenerating from scratch is still one word.
if (writes && !overwrite && fs.existsSync(OUTPUT)) {
  console.error(
    "\ndata/videos.json already exists, and this would rewrite all of it.\n\n" +
      "  That file has been corrected by hand since it was generated (BUG-018),\n" +
      "  and the rule that wrote it cannot see those corrections — it would pick\n" +
      "  the same wrong videos again.\n\n" +
      "  To look up one song without writing:  --only <slug> --verbose\n" +
      "  To regenerate the whole map anyway:   --overwrite\n",
  );
  process.exit(1);
}

const allSongs = loadSongs();
const songs = only
  ? allSongs.filter((song) => song.slug === only)
  : isPilot
    ? PILOT.map((slug) => allSongs.find((song) => song.slug === slug)).filter(
        Boolean,
      )
    : allSongs;

if (songs.length === 0) {
  console.error(only ? `No song called ${only}` : "No songs");
  process.exit(1);
}

const cache = fs.existsSync(CACHE)
  ? JSON.parse(fs.readFileSync(CACHE, "utf8"))
  : {};

// A song already in the cache is never searched again, whichever mode this is
// in. That is what makes tuning the rule cheap — `--rescore` is the same thing
// stated outright, and its only extra job is to refuse to search at all, so a
// re-run after a change to `judge()` cannot quietly become a 276-query one.
const outstanding = rescore ? [] : songs.filter((song) => !cache[song.slug]);

console.log(
  outstanding.length === 0
    ? "Applying the rule to the cache — asking YouTube nothing.\n"
    : `Searching ${outstanding.length} song${outstanding.length === 1 ? "" : "s"} through yt-dlp, ${CONCURRENCY} at a time.\n`,
);

let done = 0;
await pool(outstanding, async (song) => {
  const candidates = await search(song);
  if (candidates) cache[song.slug] = candidates;

  done++;
  if (!verbose && done % 20 === 0) {
    console.log(`  ${done}/${outstanding.length}`);
  }
});

if (outstanding.length > 0) {
  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2));
}

/* ---- the rule, applied ---- */

const chosen = new Map(); // slug -> { candidate, verdict }
const declines = []; // { slug, why }

for (const song of songs) {
  const candidates = cache[song.slug];
  if (!candidates) {
    declines.push({ slug: song.slug, why: "the search failed" });
    continue;
  }

  const winner = pick(song, candidates, verbose);
  if (!winner) {
    declines.push({ slug: song.slug, why: "no candidate passed the rule" });
    continue;
  }

  chosen.set(song.slug, winner);
}

// Rule 4, and it has to run after every song has chosen: a duplicate is only
// visible once both claims exist. The better score keeps the video and the other
// song is declined with the reason, rather than the map shipping something
// `pnpm videos` will refuse.
const byId = new Map();
for (const [slug, winner] of chosen) {
  const held = byId.get(winner.candidate.id);
  if (!held) {
    byId.set(winner.candidate.id, slug);
    continue;
  }

  const loser =
    chosen.get(held).verdict.score >= winner.verdict.score ? slug : held;
  const keeper = loser === slug ? held : slug;
  byId.set(winner.candidate.id, keeper);
  chosen.delete(loser);
  declines.push({ slug: loser, why: `same recording as ${keeper}` });
}

/* ---- write, or don't ---- */

const map = {};
for (const slug of [...chosen.keys()].sort()) {
  const { candidate } = chosen.get(slug);
  map[slug] = {
    id: candidate.id,
    title: candidate.title,
    channel: candidate.channel,
    duration: candidate.durationString ?? formatDuration(candidate.duration),
  };
}

if (writes) {
  fs.writeFileSync(OUTPUT, `${JSON.stringify(map, null, 2)}\n`);
  console.log(`\nWrote ${Object.keys(map).length} entries to data/videos.json`);
} else {
  console.log(`\n${JSON.stringify(map, null, 2)}`);
}

/* ---- the coverage, which is a result and not a score ---- */

const matched = Object.keys(map).length;
console.log(
  `\n${matched} matched, ${declines.length} declined, of ${songs.length}.`,
);

// A decline is the rule working. The list is what a later pass picks up, so it
// is printed in full rather than counted — a number nobody can act on is not a
// report.
if (declines.length > 0) {
  console.log("\nDeclined:");
  for (const { slug, why } of declines.sort((a, b) =>
    a.slug.localeCompare(b.slug),
  )) {
    console.log(`  ${slug} — ${why}`);
  }
}

const onOwnChannel = [...chosen.values()].filter(
  ({ verdict }) => verdict.why === "artist's channel",
).length;
console.log(
  `\n${onOwnChannel} of ${matched} are on a channel named for the artist.`,
);
