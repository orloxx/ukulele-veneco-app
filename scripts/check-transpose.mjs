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
 *
 * **It deliberately does not answer `format`.** Saying `"module"` tells Node
 * the file is plain ESM and turns type stripping off, so any `@/` import that
 * is not already loaded by one of the direct file-URL imports below dies on the
 * first type annotation it meets. Every module happened to be pre-loaded that
 * way until M15 added one that is not.
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
  parseChordName,
  parseKey,
  spellKey,
  spellingForKey,
  transposeChordName,
  transposeKey,
} = await import(pathToFileURL(path.join(REPO_ROOT, "src/lib/chords.ts")).href);
const { buildChordVocabulary, lookupChord } = await import(
  pathToFileURL(path.join(REPO_ROOT, "src/lib/vocabulary.ts")).href
);
const { buildTranspositions, transposeSong, transposeKeyField } = await import(
  pathToFileURL(path.join(REPO_ROOT, "src/lib/transpose.ts")).href
);
const { INSTRUMENTS, instrumentById } = await import(
  pathToFileURL(path.join(REPO_ROOT, "src/lib/instrument.ts")).href
);
const { namesMatchSongbook, songbookShiftSemitones } = await import(
  pathToFileURL(path.join(REPO_ROOT, "src/lib/tunings.ts")).href
);

/** The instrument every check below section 6 is about, unless it says otherwise. */
const UKULELE = instrumentById("ukulele");
const CUATRO = instrumentById("cuatro");

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
  // `B7aug9` is a dominant 7th with an *augmented ninth* — the ♯9, not a ♯5 with a 9.
  // en-carne-viva draws 2325, which is A-D♯-F♯-D: the 7th, 3rd, 5th and ♯9 of B, root
  // omitted. Reading "aug" as the fifth instead makes the book look wrong when it is not.
  "7aug9": [0, 3, 4, 7, 10],
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
  songs.map((song) => [
    song.slug,
    buildTranspositions(song, vocabulary, UKULELE.shapeShift),
  ]),
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
        transposeSong(song, semitones, vocabulary, UKULELE.shapeShift) === null,
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
    UKULELE.shapeShift,
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
    UKULELE.shapeShift,
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
    UKULELE.shapeShift,
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
      const back = transposeSong(
        moved,
        12 - plan.semitones,
        vocabulary,
        UKULELE.shapeShift,
      );
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

/* -------------------------------------------------- 6. the other instrument */

/**
 * M15 — the cuatro, and the one check nothing else can do.
 *
 * **It is a section of this command rather than a seventh command**, which is
 * `M15 · 6`'s judgement made against the vault's own six-commands-six-subjects
 * test. The cuatro's key sets *are* this transposer's output at a shift, over
 * this vocabulary; the numbers below go stale for exactly the reason the numbers
 * above do, on the same day, when a song is added to `songs/`. Two commands
 * failing together for one reason is the noise `pnpm difficulty` was
 * deliberately written not to add. It inherits the answer to the other question
 * too: this can fail without a defect, so it stays out of `pnpm build`.
 *
 * **The pitch-class identity is asserted from two independently written string
 * tables, and that is the whole design of this section.** Deriving the cuatro's
 * strings as the ukulele's plus two and then asserting the cuatro is the
 * ukulele plus two is BUG-019's circularity arriving for the third time — it
 * would pass for ever on a wrong tuning, the way `--verify` reported 276 songs
 * and 0 disagreeing over twenty fingerings that were wrong. So the four notes
 * of each instrument are written out here as note names, checked against the
 * app's own tunings by *name*, converted to pitch classes through this file's
 * own table, and only then compared.
 */

console.log("\nThe cuatro");

/** Note names to pitch classes. This script's own, not the app's. */
const PITCH_CLASS_OF = {
  C: 0,
  "C#": 1,
  D: 2,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "A#": 10,
  B: 11,
};

/**
 * The two instruments' open strings, 4th to 1st, written independently.
 *
 * `UKULELE_STRINGS` restates `OPEN_STRINGS` above in note names on purpose:
 * that one is a table of pitch classes and this is a table of letters, and the
 * check below needs both halves stated separately or it proves nothing.
 */
const UKULELE_STRINGS = ["G", "C", "E", "A"];
const CUATRO_STRINGS = ["A", "D", "F#", "B"];

/** The tone the whole milestone stands on, written as a number exactly once. */
const CUATRO_ABOVE_UKULELE = 2;

check("the app's strings are the notes this file names", () => {
  // The bridge between the two tables and the app. By *name*, so nothing here
  // is derived from anything below it.
  assert(
    UKULELE.stringNames.join(" ") === UKULELE_STRINGS.join(" "),
    `the ukulele is ${UKULELE.stringNames.join(" ")}, not ${UKULELE_STRINGS.join(" ")}`,
  );
  assert(
    CUATRO.stringNames.join(" ") === CUATRO_STRINGS.join(" "),
    `the cuatro is ${CUATRO.stringNames.join(" ")}, not ${CUATRO_STRINGS.join(" ")}`,
  );
  return `${UKULELE_STRINGS.join(" ")} and ${CUATRO_STRINGS.join(" ")}`;
});

check("every string of the cuatro is a ukulele string up a tone", () => {
  // Pitch classes only. The cuatro's 1st string is B3 against the ukulele's A4
  // — down ten semitones, not up two — and −10 ≡ +2 (mod 12) is precisely the
  // fact that makes a borrowed shape sound the right chord. Comparing
  // frequencies here would fail on the one string the milestone is about.
  for (let i = 0; i < 4; i++) {
    const uke = PITCH_CLASS_OF[UKULELE_STRINGS[i]];
    const cuatro = PITCH_CLASS_OF[CUATRO_STRINGS[i]];
    assert(
      cuatro === (uke + CUATRO_ABOVE_UKULELE) % 12,
      `string ${4 - i}: ${CUATRO_STRINGS[i]} is not ${UKULELE_STRINGS[i]} up a tone`,
    );
  }
  return `4 strings, each +${CUATRO_ABOVE_UKULELE} in pitch class`;
});

check("the shape shift the app applies is that tone, backwards", () => {
  // A cuatro chord X is drawn as the book's diagram for X−2, which is the only
  // number in `instrument.ts` that could silently be wrong — and it is derived
  // there, off the 3rd string, rather than typed.
  assert(UKULELE.shapeShift === 0, `the ukulele shifts ${UKULELE.shapeShift}`);
  assert(
    CUATRO.shapeShift === -CUATRO_ABOVE_UKULELE,
    `the cuatro shifts ${CUATRO.shapeShift}, expected ${-CUATRO_ABOVE_UKULELE}`,
  );
  return `ukulele 0, cuatro ${CUATRO.shapeShift}`;
});

check(
  "every fingering sounds, on the cuatro, its ukulele chord up a tone",
  () => {
    // The claim the whole milestone rests on, over every fingering the book
    // draws: hold this shape on a cuatro and what comes out is the pitch classes
    // of the ukulele chord a tone below. It is what makes the borrowed diagram
    // correct rather than merely plausible.
    let checked = 0;
    for (const [key, entry] of vocabulary) {
      const pitchClass = Number(key.split("|")[0]);
      for (const fingering of entry.fingerings) {
        if (!/^\d{4}$/.test(fingering.positions)) continue;
        checked++;
        const onUkulele = [...fingering.positions].map(
          (fret, i) => (PITCH_CLASS_OF[UKULELE_STRINGS[i]] + Number(fret)) % 12,
        );
        const onCuatro = [...fingering.positions].map(
          (fret, i) => (PITCH_CLASS_OF[CUATRO_STRINGS[i]] + Number(fret)) % 12,
        );
        for (let i = 0; i < 4; i++) {
          assert(
            onCuatro[i] === (onUkulele[i] + CUATRO_ABOVE_UKULELE) % 12,
            `${fingering.positions} (pitch class ${pitchClass}), string ${4 - i}: ` +
              `${onCuatro[i]} is not ${onUkulele[i]} up a tone`,
          );
        }
      }
    }
    assert(checked === 163, `expected 163 fingerings, checked ${checked}`);
    return `${checked} fingerings, ${checked * 4} strings`;
  },
);

const cuatroPlans = new Map(
  songs.map((song) => [
    song.slug,
    buildTranspositions(song, vocabulary, CUATRO.shapeShift),
  ]),
);

const offeredSet = (plans) => new Set(plans.map((plan) => plan.semitones));

check("the cuatro offers s exactly when the ukulele offers s − 2", () => {
  // The identity the milestone was scoped on, over all 276 songs rather than
  // over the handful it was measured on.
  for (const song of songs) {
    const uke = offeredSet(plans.get(song.slug));
    const cuatro = offeredSet(cuatroPlans.get(song.slug));
    const expected = new Set(
      [...uke].map((s) => (s + CUATRO_ABOVE_UKULELE) % 12),
    );
    assert(
      cuatro.size === expected.size &&
        [...expected].every((s) => cuatro.has(s)),
      `${song.slug}: cuatro offers ${[...cuatro].sort((a, b) => a - b)}, ` +
        `expected ${[...expected].sort((a, b) => a - b)}`,
    );
  }
  const pairs = [...cuatroPlans.values()].reduce((n, p) => n + p.length, 0);
  return `${songs.length} songs, ${pairs} song-key pairs, the ukulele's set shifted by two`;
});

check("every song offers printed+2, which is the book's page unchanged", () => {
  // The floor, and the promise the screen makes: the list is never empty, so
  // there is always something for `useTransposition` to fall back to. It holds
  // because the ukulele always offers the printed key, which is what the book
  // drew — so at printed+2 the cuatro reads that same page.
  let ownPage = 0;
  for (const song of songs) {
    const plan = cuatroPlans
      .get(song.slug)
      .find((p) => p.semitones === CUATRO_ABOVE_UKULELE);
    assert(plan !== undefined, `${song.slug} does not offer printed+2`);
    // Not merely offered — drawn from this song's own page, through rung 1 of
    // the fingering ladder. Anything else would mean a reader at printed+2 is
    // holding a shape from some other song for no reason.
    for (const chord of song.chordDefinitions) {
      const moved = plan.chords.find((c) => c.name === plan.names[chord.name]);
      assert(
        moved !== undefined && moved.positions === chord.positions,
        `${song.slug}: ${chord.name} at printed+2 is ${moved?.positions}, ` +
          `not the page's own ${chord.positions}`,
      );
      ownPage++;
    }
  }
  return `${songs.length} songs, ${ownPage} chords, every one the book's own diagram`;
});

check("the reach matches what the milestone measured", () => {
  const drawable = songs.filter((song) =>
    offeredSet(cuatroPlans.get(song.slug)).has(0),
  );
  const blocked = songs.filter(
    (song) => !offeredSet(cuatroPlans.get(song.slug)).has(0),
  );

  // What stops a song being drawn in its printed key: a chord the book never
  // draws a tone below. Counted by name, because one chord appearing twice in a
  // song is one chord missing.
  const blockers = new Map();
  const byOne = blocked.filter((song) => {
    const missing = new Set();
    for (const chord of song.chordDefinitions) {
      const { pitchClass, quality } = parseChordName(chord.name);
      if (!lookupChord(vocabulary, (pitchClass + 10) % 12, quality))
        missing.add(chord.name);
    }
    for (const name of missing)
      blockers.set(name, (blockers.get(name) ?? 0) + 1);
    return missing.size === 1;
  });

  const measured = {
    drawable: drawable.length,
    blocked: blocked.length,
    blockedByOne: byOne.length,
  };
  const expected = { drawable: 236, blocked: 40, blockedByOne: 29 };
  assert(
    JSON.stringify(measured) === JSON.stringify(expected),
    `the cuatro's reach changed.\n` +
      `expected ${JSON.stringify(expected)}\n` +
      `measured ${JSON.stringify(measured)}\n` +
      `If songs/ was edited on purpose, update these numbers here.`,
  );

  // Printed, not asserted — `pnpm difficulty`'s rule: one tripwire per fact.
  // Four of the 40 are BUG-016 rather than the cancionero.
  const top = [...blockers]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([name, n]) => `${name} (${n})`)
    .join(", ");
  return `236 in their printed key, 40 blocked, 29 of those by one chord — most wanted ${top}`;
});

check("a cuatro sheet only ever draws a fingering the book prints", () => {
  // Vault `DECISIONS.md` 6, held for the instrument nobody here owns. Nothing
  // is invented: every diagram is traceable to a page, and this proves it for
  // the whole cuatro plan set rather than for the printed key alone.
  let chords = 0;
  let borrowed = null;
  for (const song of songs) {
    for (const plan of cuatroPlans.get(song.slug)) {
      for (const chord of plan.chords) {
        chords++;
        const { pitchClass, quality } = parseChordName(chord.name);
        const drawn = (pitchClass + 12 + CUATRO.shapeShift) % 12;
        const entry = lookupChord(vocabulary, drawn, quality);
        assert(
          entry !== undefined,
          `${song.slug} +${plan.semitones}: nothing in the book draws ${chord.name} for a cuatro`,
        );
        const printed = entry.fingerings.find(
          (f) => f.positions === chord.positions,
        );
        assert(
          printed !== undefined,
          `${song.slug} +${plan.semitones}: ${chord.name} = ${chord.positions} is not a fingering the book prints`,
        );
        if (!borrowed && plan.semitones === 0)
          borrowed = `${song.slug} plays ${chord.name} = ${chord.positions}, which the book draws in ${printed.sources[0]}`;
      }
    }
  }
  return `${chords} chords, every one a diagram the book prints — e.g. ${borrowed}`;
});

check("every cuatro shape still fits the four-fret window", () => {
  // BUG-001's guard, which `pnpm validate` and `ChordDiagram` have to agree
  // about. It holds trivially — these are the same 163 fingerings — and it is
  // asserted rather than argued because "the same fingerings" is the claim.
  let widest = 0;
  for (const song of songs) {
    for (const plan of cuatroPlans.get(song.slug)) {
      for (const chord of plan.chords) {
        const stopped = [...chord.positions]
          .map(Number)
          .filter((fret) => fret > 0);
        if (stopped.length === 0) continue;
        const span = Math.max(...stopped) - Math.min(...stopped) + 1;
        widest = Math.max(widest, span);
        assert(
          span <= 4,
          `${song.slug} +${plan.semitones}: ${chord.name} = ${chord.positions} spans ${span} frets`,
        );
      }
    }
  }
  return `widest span ${widest} frets, against a window of 4`;
});

check("where the book names no chord, the key signature does", () => {
  // **The rung the cuatro added, and the reason it had to exist.** On the
  // ukulele a name and a fingering come out of one vocabulary entry, so "the
  // book draws this" and "the book names this" are one statement. On the cuatro
  // the shape is asked of the entry two semitones below and the name of the
  // entry at the chord itself, and the second can be missing while the first is
  // not — 196 of the 2629 offered keys, across 112 songs.
  //
  // What is asserted is not the fallback's existence but its *shape*: where the
  // book has no usage to defer to, the name is exactly the target key's
  // signature name and never something invented.
  let pairs = 0;
  const affected = new Set();
  for (const song of songs) {
    const key = parseKey(song.metadata.key);
    for (const plan of cuatroPlans.get(song.slug)) {
      let usedFallback = false;
      for (const chord of song.chordDefinitions) {
        const { pitchClass, quality } = parseChordName(chord.name);
        const target = (pitchClass + plan.semitones) % 12;
        if (target === pitchClass) continue; // the song's own name, rung 1
        if (lookupChord(vocabulary, target, quality)) continue; // the book names it
        usedFallback = true;
        const spelling = key
          ? spellingForKey(transposeKey(key, plan.semitones))
          : "flat";
        assert(
          plan.names[chord.name] ===
            transposeChordName(chord.name, plan.semitones, spelling),
          `${song.slug} +${plan.semitones}: ${chord.name} became ` +
            `${plan.names[chord.name]}, not the ${spelling} name its key wants`,
        );
      }
      if (usedFallback) {
        pairs++;
        affected.add(song.slug);
      }
    }
  }
  const measured = { pairs, songs: affected.size };
  const expected = { pairs: 196, songs: 112 };
  assert(
    JSON.stringify(measured) === JSON.stringify(expected),
    `expected ${JSON.stringify(expected)}, measured ${JSON.stringify(measured)}`,
  );
  return `${pairs} song-key pairs across ${affected.size} songs name a chord the book never writes`;
});

check("the difficulty band does not move with the instrument", () => {
  // Vault `DECISIONS.md` 23's argument, one step over: transposing maps
  // distinct chords to distinct chords, and so does changing instrument — the
  // chords are the same chords. A band that moved would be reporting a change
  // that did not happen.
  for (const song of songs) {
    const counts = new Set(
      cuatroPlans.get(song.slug).map((plan) => plan.chords.length),
    );
    for (const plan of plans.get(song.slug)) counts.add(plan.chords.length);
    assert(
      counts.size === 1,
      `${song.slug}: chord count varies across keys and instruments (${[...counts]})`,
    );
  }
  return `${songs.length} songs, one chord count each across both instruments and every key`;
});

/* -------------------------------------------------------- 7. the afinador */

console.log("\nThe afinador, per instrument");

check("each instrument offers its own tunings and only its own", () => {
  assert(
    UKULELE.tunings.length === 4,
    `the ukulele offers ${UKULELE.tunings.length}`,
  );
  // One, and that is `M15 · 4`'s decision rather than a gap: nobody here knows
  // a second worth offering and there is no cuatro chart in the repo to
  // arbitrate one.
  assert(
    CUATRO.tunings.length === 1,
    `the cuatro offers ${CUATRO.tunings.length}`,
  );
  assert(
    CUATRO.tunings[0].id === "cambur-pinton",
    `the cuatro's tuning is ${CUATRO.tunings[0].id}`,
  );
  const shared = UKULELE.tunings.filter((tuning) =>
    CUATRO.tunings.some((other) => other.id === tuning.id),
  );
  assert(shared.length === 0, `${shared.length} tuning is in both lists`);
  return `4 for the ukulele, 1 for the cuatro, none shared`;
});

check(
  "the cuatro's tuning is A4 D4 F#4 B3 and not the ukulele's D tuning",
  () => {
    // A4 D4 F♯4 B4 will be re-proposed, because it would let the verification's
    // substitute ukulele be tuned without leaving cuatro mode. It is the
    // ukulele's `d`, it is not a cuatro tuning, and a list that carries one to
    // make a test convenient has stopped describing the instrument.
    const cambur = CUATRO.tunings[0].strings;
    const octaves = cambur.map((s) => s.octave).join("");
    assert(octaves === "4443", `cambur pintón sits at octaves ${octaves}`);
    const d = UKULELE.tunings.find((t) => t.id === "d");
    assert(
      d.strings.map((s) => s.octave).join("") === "4444",
      "the ukulele's d tuning is not A4 D4 F#4 B4",
    );
    // Same notes, different octave on the 1st string — which is exactly why they
    // would have read as duplicates in one list, and why they are never in one.
    assert(
      d.strings.map((s) => s.name).join(" ") ===
        cambur.map((s) => s.name).join(" "),
      "the two should differ only in the 1st string's octave",
    );
    // **246.94 Hz, and `M15 · 4` said 123.47.** That is B2, an octave under the
    // note it names, and the paragraph built on it — that the cuatro's bottom
    // string falls below the D3 `ANALYSIS_WINDOW` is sized for — is therefore
    // about an instrument nobody plays. B3 is a fifth *above* baritone's D3, so
    // the cuatro adds nothing at the bottom of the detector's range and the
    // window is untouched for a stronger reason than the milestone expected.
    const b3 = cambur[3].frequency;
    const d3 = UKULELE.tunings.find((t) => t.id === "baritone").strings[0]
      .frequency;
    assert(
      Math.abs(b3 - 246.9417) < 0.001,
      `the cuatro's 1st string is ${b3.toFixed(4)} Hz, expected 246.9417`,
    );
    assert(
      b3 > d3,
      `B3 at ${b3.toFixed(2)} is below baritone's D3 at ${d3.toFixed(2)} — ` +
        `the detector's window is sized from the lowest note any tuning offers`,
    );
    return `A4 D4 F#4 B3, 1st string ${b3.toFixed(2)} Hz — above baritone's ${d3.toFixed(2)}, and an octave under the ukulele's d`;
  },
);

check("the chord-name caveat fires on the right tunings and no others", () => {
  // It is measured against the instrument's *own* reference since M15. Against
  // standard ukulele the cuatro would report +2 and the caveat would fire on
  // the one tuning it must never fire on — the tuning M15 moved the diagrams to
  // meet.
  const expected = {
    standard: 0,
    "low-g": 0,
    d: 2,
    baritone: -5,
    "cambur-pinton": 0,
  };
  for (const item of INSTRUMENTS) {
    for (const tuning of item.tunings) {
      const shift = songbookShiftSemitones(tuning, item.reference);
      assert(
        shift === expected[tuning.id],
        `${item.id}/${tuning.id}: shift ${shift}, expected ${expected[tuning.id]}`,
      );
      assert(
        namesMatchSongbook(tuning, item.reference) === (shift === 0),
        `${item.id}/${tuning.id}: the caveat disagrees with the shift`,
      );
    }
  }
  assert(
    namesMatchSongbook(CUATRO.tunings[0], CUATRO.reference),
    "the caveat fires on cambur pintón, which is the one tuning it must not",
  );
  return `5 tunings — d +2, baritone −5, the other three exempt`;
});

/* -------------------------------------------------------------- the tail */

console.log(
  `\n${checks - failures}/${checks} checks passed` +
    (failures ? ` — ${failures} FAILED` : ""),
);
process.exit(failures ? 1 : 0);
