#!/usr/bin/env node
/**
 * check-transpose.mjs — the transposer, checked against the whole collection.
 *
 *   pnpm transpose
 *
 * **This milestone is exhaustively checkable and is checked exhaustively.**
 * There are 276 songs and eleven transpositions, so 3036 song-and-key pairs,
 * and `src/lib/transpose.ts` is a pure function — there is no excuse for
 * sampling and none is taken.
 *
 * The subject is the transposer and the vocabulary it stands on, which is why
 * this is a third command beside `pnpm validate` (the song format) and
 * `pnpm credits` (the attribution) rather than a fourth section of either.
 *
 * **It is deliberately not wired into `pnpm build`**, unlike `pnpm credits`.
 * The numbers below are asserted exactly, so adding one song to `songs/` is
 * meant to fail this — that is the tripwire working, and it tells you the
 * collection's reach changed. A check that failed every deploy for a reason
 * that is not a defect would be deleted within a month, and the credit check
 * gates the build because losing the credit is the one thing this project is
 * not free to do. Run this after touching `songs/`, and update the numbers
 * here in the same commit.
 *
 * Exits non-zero on any failure.
 */

import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import matter from "gray-matter";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

/**
 * Import the app's own TypeScript rather than reimplementing it.
 *
 * A check that reimplements what it checks proves the two implementations
 * agree and nothing about whether either is right — and this is exactly the
 * milestone where that would matter, because the arithmetic is easy to get
 * consistently wrong. Node strips the types; this hook is only here to resolve
 * the `@/` alias that `tsconfig.json` sets and Node does not read.
 */
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const target = path.join(REPO_ROOT, "src", specifier.slice(2));
      return {
        url: `${pathToFileURL(target).href}.ts`,
        format: "module",
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

const { parseChordName, parseKey, spellKey, spellingForKey, transposeKey } =
  await import(pathToFileURL(path.join(REPO_ROOT, "src/lib/chords.ts")).href);
const { buildChordVocabulary, lookupChord } = await import(
  pathToFileURL(path.join(REPO_ROOT, "src/lib/vocabulary.ts")).href
);
const { buildTranspositions, transposeSong, transposeKeyField } = await import(
  pathToFileURL(path.join(REPO_ROOT, "src/lib/transpose.ts")).href
);

/* ------------------------------------------------------------------ songs */

const SONGS = path.join(REPO_ROOT, "songs");

const songs = fs
  .readdirSync(SONGS)
  .filter((file) => file.endsWith(".md") && file !== "README.md")
  .sort()
  .map((file) => {
    const { data, content } = matter(
      fs.readFileSync(path.join(SONGS, file), "utf8"),
    );
    const capo = content
      .trim()
      .split("\n")[0]
      .match(/^Capo (\d+)$/);
    return {
      slug: file.replace(/\.md$/, ""),
      metadata: { key: String(data.key ?? "") },
      capo: capo ? Number(capo[1]) : undefined,
      chordDefinitions: (data.chords ?? []).map((chord) =>
        typeof chord === "string"
          ? { name: chord, positions: "" }
          : { name: chord.name, positions: chord.positions ?? "" },
      ),
    };
  });

const vocabulary = buildChordVocabulary(songs);

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

/* ------------------------------------------------- 1. the vocabulary index */

console.log("\nThe book's chord vocabulary");

check("the measured numbers have not moved", () => {
  const names = new Set();
  const pairs = new Set();
  let associations = 0;
  for (const song of songs)
    for (const chord of song.chordDefinitions) names.add(chord.name);
  for (const [key, entry] of vocabulary) {
    pairs.add(key);
    associations += entry.fingerings.length;
  }

  const measured = {
    songs: songs.length,
    names: names.size,
    pairs: pairs.size,
    associations,
  };
  const expected = { songs: 276, names: 143, pairs: 127, associations: 163 };

  assert(
    JSON.stringify(measured) === JSON.stringify(expected),
    `the collection's reach changed.\n` +
      `expected ${JSON.stringify(expected)}\n` +
      `measured ${JSON.stringify(measured)}\n` +
      `If songs/ was edited on purpose, update these numbers here.`,
  );
  return `${measured.songs} songs, ${measured.names} names, ${measured.pairs} pairs, ${measured.associations} fingerings`;
});

check("every chord name in songs/ parses", () => {
  const names = new Set();
  for (const song of songs)
    for (const chord of song.chordDefinitions) names.add(chord.name);
  for (const name of names) parseChordName(name);
  return `${names.size} names, none unreadable`;
});

/**
 * Every fingering sounds the chord its own name claims — BUG-019's guard.
 *
 * The book is gone (M6), so `--verify` cannot be re-run and `songs/` is the
 * record rather than a copy of one. This is what is left that can still say a
 * fingering is wrong: the four strings sound four pitches, and the name says
 * which pitches those may be. It is not a transcription check and cannot be —
 * it never sees the book. It is a check that the data is *possible*.
 *
 * BUG-019 was twenty fingerings whose barre had been read as open strings, and
 * fifteen of them sound a note their name excludes, so this would have caught
 * them at transcription time. The other five landed on a chord tone anyway
 * (`C#m` 6404 is C#-E-E-C#, all of them in C#m) and nothing but the book could
 * ever have caught those.
 *
 * **The allowlist is the book's own, and that is the point of listing it by
 * value.** Eighteen printed diagrams do not sound their printed name — page 70
 * draws three chords a semitone below their labels, page 22's `Ab7` a semitone
 * above — and vault `DECISIONS.md` 6 says fingerings follow the book, so they
 * stay exactly as drawn. Keying the allowlist on song, name *and* fingering is
 * what keeps it from becoming a blanket exemption: change one of these values
 * and the check fails again, because the new value is not the book's either.
 */
const SOUNDS_UNLIKE_ITS_NAME = new Set([
  "canto-al-avila C#m 4407",
  "cuchi-cuchi B7 3210",
  "el-lado-prohibido Db7 3433",
  "en-carne-viva B7aug9 2325",
  "estoy-afuera-sal G# 4232",
  "libera-tu-mente Ab7 6757",
  "mi-cura-mi-enfermedad E² 3402",
  "muera-el-amor C#b5 1134",
  "muera-el-amor D#6 5346",
  "papua-retroespas B² 4522",
  "papua-retroespas C#m² 6744",
  "sin-sombra-no-hay-luz-gm Ab 6454",
  "tan-enamorados Ebsus4 0341",
  "un-poquito-mas Ab7 6757",
  "un-poquito-mas Cmmaj7 3222",
  "un-poquito-mas Dbmmaj7 4333",
  "un-poquito-mas Ebmaj7 2224",
  "volare G5 0124",
]);

/**
 * What each quality is made of, in semitones above the root.
 *
 * `src/lib/chords.ts` deliberately never asks what a quality *means* — that is
 * why it is right about all 143 of the book's names, five of which are not
 * standard notation. So this table cannot be imported from the app: the app
 * does not have one, and should not.
 */
const QUALITY_INTERVALS = {
  "": [0, 4, 7],
  m: [0, 3, 7],
  5: [0, 7],
  6: [0, 4, 7, 9],
  7: [0, 4, 7, 10],
  m6: [0, 3, 7, 9],
  m7: [0, 3, 7, 10],
  m9: [0, 2, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  mmaj7: [0, 3, 7, 11],
  m7M: [0, 3, 7, 11],
  // `Em7^` is the book's own notation and it is not a m(maj7): terrenal draws
  // it as 7777, which is D-G-B-E, an ordinary Em7 taken up the neck. The caret
  // marks the position, not the quality.
  "m7^": [0, 3, 7, 10],
  dim7: [0, 3, 6, 9],
  m7b5: [0, 3, 6, 10],
  b5: [0, 4, 6],
  "+": [0, 4, 8],
  "7+": [0, 4, 8, 10],
  "7aug9": [0, 2, 4, 8, 10],
  add9: [0, 2, 4, 7],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  "7sus2": [0, 2, 7, 10],
  "7sus4": [0, 5, 7, 10],
  "7sus4²": [0, 5, 7, 10],
};

/** Open strings, as pitch classes: G C E A. */
const OPEN_STRINGS = [7, 0, 4, 9];

check("every fingering sounds the chord its name claims", () => {
  const unexpected = [];
  let checked = 0;
  let allowed = 0;

  for (const song of songs) {
    for (const chord of song.chordDefinitions) {
      if (!/^\d{4}$/.test(chord.positions)) continue;
      const { pitchClass, quality } = parseChordName(chord.name);
      // A trailing superscript 2 marks a second shape for the same chord, not
      // a different chord — BUG-016 is about what that costs elsewhere.
      const intervals = QUALITY_INTERVALS[quality.replace(/²$/, "")];
      if (intervals === undefined) continue; // no opinion is better than a wrong one
      checked++;

      const permitted = new Set(intervals.map((i) => (pitchClass + i) % 12));
      const sounded = [...chord.positions].map(
        (fret, string) => (OPEN_STRINGS[string] + Number(fret)) % 12,
      );
      if (sounded.every((pc) => permitted.has(pc))) continue;

      const key = `${song.slug} ${chord.name} ${chord.positions}`;
      if (SOUNDS_UNLIKE_ITS_NAME.has(key)) allowed++;
      else unexpected.push(key);
    }
  }

  assert(
    unexpected.length === 0,
    `${unexpected.length} fingering(s) sound a note their name excludes:\n` +
      `${unexpected.join("\n")}\n` +
      `If the book really draws it that way, add it to SOUNDS_UNLIKE_ITS_NAME.`,
  );
  return `${checked} fingerings, ${allowed} of them the book's own oddities`;
});

check("the allowlist has no entry the collection no longer holds", () => {
  // An allowlist that outlives what it excuses is how a check quietly stops
  // checking. Every entry must still be in songs/, spelt exactly this way.
  const held = new Set();
  for (const song of songs)
    for (const chord of song.chordDefinitions)
      held.add(`${song.slug} ${chord.name} ${chord.positions}`);
  const stale = [...SOUNDS_UNLIKE_ITS_NAME].filter((key) => !held.has(key));
  assert(stale.length === 0, `stale allowlist entries:\n${stale.join("\n")}`);
  return `${SOUNDS_UNLIKE_ITS_NAME.size} entries, all still printed`;
});

check("enharmonics fold — the index is keyed by pitch class", () => {
  // The check that would fail on an index keyed by written name: the book
  // prints both spellings, and a name-keyed index would report one of each
  // pair unavailable.
  const both = [];
  for (const [sharp, flat] of [
    ["C#", "Db"],
    ["D#", "Eb"],
    ["F#", "Gb"],
    ["G#", "Ab"],
  ]) {
    const seen = new Set();
    for (const song of songs)
      for (const chord of song.chordDefinitions)
        if (chord.name.startsWith(sharp) || chord.name.startsWith(flat))
          seen.add(chord.name.startsWith(sharp) ? "sharp" : "flat");
    if (seen.size === 2) both.push(`${sharp}/${flat}`);
  }
  assert(both.length === 4, `expected all four pairs spelt both ways`);
  return `${both.join(", ")} each appear both ways`;
});

/* ------------------------------------------- 2. every song, every offered key */

console.log("\nEvery song, in every key it offers");

const plans = new Map(
  songs.map((song) => [song.slug, buildTranspositions(song, vocabulary)]),
);

check(
  "every chord of every offered key has a fingering the book prints",
  () => {
    let pairsChecked = 0;
    let chordsChecked = 0;
    let evidence = null;

    for (const song of songs) {
      for (const plan of plans.get(song.slug)) {
        pairsChecked++;
        for (const chord of plan.chords) {
          chordsChecked++;
          const { pitchClass, quality } = parseChordName(chord.name);
          const entry = lookupChord(vocabulary, pitchClass, quality);
          assert(
            entry !== undefined,
            `${song.slug} +${plan.semitones}: ${chord.name} is in the sheet and nowhere in the book`,
          );
          assert(
            entry.names.includes(chord.name),
            `${song.slug} +${plan.semitones}: the book never writes the name ${chord.name} (it writes ${entry.names.join("/")})`,
          );
          const printed = entry.fingerings.find(
            (fingering) => fingering.positions === chord.positions,
          );
          assert(
            printed !== undefined,
            `${song.slug} +${plan.semitones}: ${chord.name} = ${chord.positions} is not a fingering the book prints for it`,
          );
          // The trace back to a page, not merely the existence of one.
          if (
            !evidence &&
            plan.semitones > 0 &&
            printed.sources[0] !== song.slug
          )
            evidence = `${song.slug} +${plan.semitones} plays ${chord.name} = ${chord.positions}, which the book prints in ${printed.sources[0]}`;
        }
      }
    }

    assert(
      evidence !== null,
      "no transposed chord could be traced to another song",
    );
    return `${pairsChecked} song-key pairs, ${chordsChecked} chords — e.g. ${evidence}`;
  },
);

check("the offered count matches what the milestone measured", () => {
  const distribution = new Map();
  for (const plan of plans.values()) {
    // The printed key is always offered, so eleven is "all of them".
    const offered = plan.length - 1;
    distribution.set(offered, (distribution.get(offered) ?? 0) + 1);
  }
  assert(
    distribution.get(11) === 164,
    `expected 164 songs offering all eleven, got ${distribution.get(11)}`,
  );
  assert(
    distribution.get(0) === 18,
    `expected 18 songs offering none, got ${distribution.get(0)}`,
  );
  return `164 songs offer all eleven, 18 offer none`;
});

check("a key that is not offered is genuinely unplayable", () => {
  // The 18 are the case to check, not the 164. For each, prove every one of the
  // eleven shifts really does need a chord the book never prints.
  const zero = songs.filter((song) => plans.get(song.slug).length === 1);
  assert(zero.length === 18, `expected 18 songs, got ${zero.length}`);

  for (const song of zero) {
    for (let semitones = 1; semitones <= 11; semitones++) {
      const missing = song.chordDefinitions.filter((chord) => {
        const { pitchClass, quality } = parseChordName(chord.name);
        return !lookupChord(vocabulary, (pitchClass + semitones) % 12, quality);
      });
      assert(
        missing.length > 0,
        `${song.slug} +${semitones} was withheld but every chord resolves`,
      );
      assert(
        transposeSong(song, semitones, vocabulary) === null,
        `${song.slug} +${semitones} is unplayable but transposeSong returned a sheet`,
      );
    }
  }
  return `${zero.length} songs × 11 keys, each blocked by a chord the book never prints`;
});

/* ------------------------------------------------------------ 3. spelling */

console.log("\nSpelling");

check("the target key decides, not a global preference for sharps", () => {
  // The case that fails on an always-sharps implementation: a song in C moved
  // up a semitone is in Db, and its chords are flats. An always-sharps
  // transposer gives C#, F#, G# — musically identical and wrong to read.
  const song = songs.find((s) => s.slug === "volare");
  assert(song !== undefined, "volare not found");
  const flatward = transposeSong(
    {
      metadata: { key: "C" },
      chordDefinitions: [{ name: "C", positions: "0003" }],
    },
    1,
    vocabulary,
  );
  assert(
    flatward.chords[0].name === "Db",
    `C up one in Db major should be Db, got ${flatward.chords[0].name}`,
  );
  const sharpward = transposeSong(
    {
      metadata: { key: "C" },
      chordDefinitions: [{ name: "C", positions: "0003" }],
    },
    2,
    vocabulary,
  );
  assert(
    sharpward.chords[0].name === "D",
    `C up two should be D, got ${sharpward.chords[0].name}`,
  );
  const intoE = transposeSong(
    {
      metadata: { key: "C" },
      chordDefinitions: [{ name: "D", positions: "2220" }],
    },
    4,
    vocabulary,
  );
  assert(
    intoE.chords[0].name === "F#",
    `D up four in E major should be F#, not Gb, got ${intoE.chords[0].name}`,
  );
  return "Db major takes flats, E major takes sharps";
});

check("the two enharmonic ties follow the book, not the arithmetic", () => {
  // F# major over Gb major, Eb minor over D# minor. A derivation off the
  // relative major gets the second one wrong and gives D#m — a key the
  // collection itself writes Ebm.
  assert(
    spellKey({ pitchClass: 6, minor: false }) === "F#",
    "pitch class 6 major should be F#",
  );
  assert(
    spellKey({ pitchClass: 3, minor: true }) === "Ebm",
    "pitch class 3 minor should be Ebm",
  );
  assert(
    spellingForKey({ pitchClass: 6, minor: false }) === "sharp",
    "F# major should spell sharps",
  );
  assert(
    spellingForKey({ pitchClass: 3, minor: true }) === "flat",
    "Eb minor should spell flats",
  );
  return "F# major and Eb minor";
});

check("the app never writes a name the cancionero does not", () => {
  // The check that catches the blanket key-signature rule. Applied without the
  // book's own usage as a constraint it asks for a name the collection never
  // prints 562 times — `A#` in a sharp key against 96 `Bb` and no `A#` at all,
  // `D#7` for its `Eb7`. Names are a vocabulary a player says out loud, so the
  // app re-spelling them is the app disagreeing with its source.
  let checked = 0;
  for (const song of songs) {
    for (const plan of plans.get(song.slug)) {
      for (const chord of plan.chords) {
        const { pitchClass, quality } = parseChordName(chord.name);
        assert(
          lookupChord(vocabulary, pitchClass, quality).names.includes(
            chord.name,
          ),
          `${song.slug} +${plan.semitones}: ${chord.name} is not a name the book uses`,
        );
        checked++;
      }
    }
  }
  return `${checked} chord names, every one of them the book's own`;
});

check("where the book gives a choice, the key signature takes it", () => {
  // **A transposed sheet can legitimately mix sharps and flats, and asserting
  // it cannot was this check's first mistake.** The book writes no `A#` at all
  // — 96 `Bb` and not one `A#` in 2140 chords — so F# major has to borrow `Bb`
  // for its flat third, and 224 offered keys do exactly that. Forcing the
  // signature there would invent notation the cancionero does not use.
  //
  // So the precise property is this: **wherever the book prints both spellings,
  // the one on the sheet is the one the target key wants.** That is what pins
  // the defect this replaced — a song holding an `Eb` had a different chord
  // land on that pitch class at four semitones, borrowed the `Eb` name, and
  // printed a flat in the middle of F# major where the book prints `D#` too.
  let decided = 0;
  const wrong = [];
  for (const song of songs) {
    const key = parseKey(song.metadata.key);
    if (!key) continue;
    for (const plan of plans.get(song.slug)) {
      if (plan.semitones === 0) continue; // the book's own page, as printed
      const spelling = spellingForKey(transposeKey(key, plan.semitones));
      for (const chord of plan.chords) {
        const { root, quality, pitchClass } = parseChordName(chord.name);
        const { names } = lookupChord(vocabulary, pitchClass, quality);
        // Only a chord the book spells both ways is a decision at all.
        const bothWays =
          names.some((name) => name[1] === "#") &&
          names.some((name) => name[1] === "b");
        if (!bothWays) continue;
        decided++;
        if (
          root.length > 1 &&
          (root[1] === "#" ? "sharp" : "flat") !== spelling
        )
          wrong.push(
            `${song.slug} +${plan.semitones} (${plan.key}, ${spelling}): ${chord.name} — book writes ${names.join("/")}`,
          );
      }
    }
  }
  assert(
    wrong.length === 0,
    `${wrong.length} chords spelt against their key:\n${wrong.slice(0, 5).join("\n")}`,
  );
  return `${decided} chords where the book prints both spellings, every one following its key`;
});

check("every song's own key survives a shift of zero", () => {
  for (const song of songs) {
    const printed = plans.get(song.slug)[0];
    assert(
      printed.semitones === 0,
      `${song.slug}: first plan is not the printed key`,
    );
    assert(
      printed.key === song.metadata.key,
      `${song.slug}: tono chip reads ${printed.key}, file says ${song.metadata.key}`,
    );
  }
  return `${songs.length} songs, tono unchanged at zero`;
});

check("a modulating key field moves every key in it", () => {
  const multi = songs.filter((song) => song.metadata.key.includes(";"));
  assert(
    multi.length === 12,
    `expected 12 modulating songs, got ${multi.length}`,
  );
  assert(
    transposeKeyField("A; Bb", 1) === "Bb; B",
    `A; Bb up one should be Bb; B, got ${transposeKeyField("A; Bb", 1)}`,
  );
  // Db and not C#: each key is written the way a musician writes it, and up two
  // from B is Db major with five flats rather than C# major with seven sharps.
  assert(
    transposeKeyField("B; C; D; Eb", 2) === "Db; D; E; F",
    `got ${transposeKeyField("B; C; D; Eb", 2)}`,
  );
  return `${multi.length} songs name more than one key`;
});

/* ----------------------------------------------------------- 4. identity */

console.log("\nIdentity and the round trip");

check("a shift of zero returns the song untouched", () => {
  for (const song of songs) {
    const printed = plans.get(song.slug)[0];
    for (const chord of song.chordDefinitions) {
      assert(
        printed.names[chord.name] === chord.name,
        `${song.slug}: ${chord.name} renamed to ${printed.names[chord.name]} at zero`,
      );
      const same = printed.chords.find((c) => c.name === chord.name);
      assert(
        same !== undefined && same.positions === chord.positions,
        `${song.slug}: ${chord.name} refingered at zero`,
      );
    }
  }
  return `${songs.length} songs, by the general rule and not by a branch`;
});

check("the round trip — the weak check, and it is labelled weak", () => {
  // Up n and back down n returns the original names on any implementation that
  // is symmetric, INCLUDING one that is wrong in both directions. It proves the
  // arithmetic is reversible and nothing whatever about whether it is right —
  // the checks above are the ones that separate a working transposer from one
  // that merely looks like one. It is here because a failure would still mean
  // something is badly wrong.
  let trips = 0;
  for (const song of songs) {
    for (const plan of plans.get(song.slug)) {
      if (plan.semitones === 0) continue;
      const moved = {
        metadata: { key: plan.key },
        chordDefinitions: plan.chords,
      };
      const back = transposeSong(moved, 12 - plan.semitones, vocabulary);
      if (!back) continue;
      trips++;
      for (const chord of song.chordDefinitions) {
        const there = plan.names[chord.name];
        const home = back.names[there];
        const { pitchClass: a } = parseChordName(chord.name);
        const { pitchClass: b } = parseChordName(home);
        assert(
          a === b,
          `${song.slug}: ${chord.name} -> ${there} -> ${home} is a different chord`,
        );
      }
    }
  }
  return `${trips} round trips, compared by pitch class because the spelling legitimately changes`;
});

/* --------------------------------------------------------------- 5. capo */

console.log("\nThe capo");

check("key is the written key, which is what lets the capo compose", () => {
  const capoSongs = songs.filter((song) => song.capo !== undefined);
  const written = capoSongs.filter((song) => {
    const names = song.chordDefinitions.map((chord) => chord.name);
    const key = song.metadata.key;
    return names.includes(key) || names.includes(key.replace(/m$/, ""));
  });
  assert(
    capoSongs.length === 50,
    `expected 50 capo songs, got ${capoSongs.length}`,
  );
  assert(
    written.length === 44,
    `expected 44 with the key among their own chords, got ${written.length}`,
  );
  return `${written.length} of ${capoSongs.length} print their key as one of their own chords`;
});

check("a capo song transposes its shapes and keeps its capo", () => {
  const song = songs.find(
    (s) => s.capo !== undefined && plans.get(s.slug).length > 1,
  );
  const plan = plans.get(song.slug)[1];
  const originalKey = parseKey(song.metadata.key);
  const movedKey = parseKey(plan.key);
  assert(
    (originalKey.pitchClass + plan.semitones) % 12 === movedKey.pitchClass,
    `${song.slug}: the written key did not move with the shapes`,
  );
  // Nothing in the transposition touches the capo — it is not in the plan at
  // all, which is the decision: the badge stays, the shapes move, the sounding
  // key moves by the same amount.
  assert(
    !("capo" in plan),
    "a transposition should have no opinion about the capo",
  );
  return `${song.slug} (capo ${song.capo}) +${plan.semitones}: ${song.metadata.key} -> ${plan.key}, capo untouched`;
});

/* -------------------------------------------------------------- the tail */

console.log(
  `\n${checks - failures}/${checks} checks passed` +
    (failures ? ` — ${failures} FAILED` : ""),
);
process.exit(failures ? 1 : 0);
