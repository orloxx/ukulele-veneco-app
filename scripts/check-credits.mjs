#!/usr/bin/env node
/**
 * check-credits.mjs — fail the build if the attribution has gone missing.
 *
 *   pnpm credits          check the sources, and the built pages if there are any
 *   pnpm build            runs this after next build, so a deploy cannot ship without it
 *
 * The cancionero is Ciro Durán's work. It is used with his permission, and crediting him
 * is the single condition attached to that permission — vault DECISIONS.md 1. So the
 * credit is a requirement of this project rather than a courtesy, and it is the kind of
 * requirement that dies quietly: nobody deletes it on purpose, they refactor a footer, or
 * tidy a metadata block, or rewrite a page and carry over everything except one sentence.
 *
 * At M6 the source PDF was deleted. Nothing in the repo points at where the songs came
 * from any more except these files, which is exactly why this check was written then: the
 * credit now has to outlive the thing that made it obvious.
 *
 * Two halves, and the second is the one that matters:
 *
 *  1. The sources still say it. Cheap, and it names the file to put it back in.
 *  2. The *rendered* pages still say it — every song page, the list, the landing. That is
 *     the half a refactor can break without touching any of the strings above, because
 *     what puts the credit on a song page is <Footer /> in the app shell and not anything
 *     the song page itself does. A song saved for offline use is one of these HTML files
 *     in the service worker's cache, so this is also the check that the credit reaches
 *     somebody reading on a plane.
 *
 * Exits non-zero on anything missing. There are no warnings here: a credit is present or
 * it is not.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

/** The two things every credit has to carry: who, and where to find the original. */
const AUTHOR = "Ciro Durán";
const ORIGIN = "elukulelevene.co";

/**
 * Read a file as NFC.
 *
 * `Durán` can be stored as one code point or as `n` plus a combining accent, and the two
 * are indistinguishable on screen. Normalising both sides means an editor that saves in
 * NFD cannot fail this check for a difference nobody can see.
 */
function read(file) {
  return fs.readFileSync(path.join(REPO_ROOT, file), "utf8").normalize("NFC");
}

/**
 * Comments do not count as a credit.
 *
 * Every component that renders the credit also *explains* it in a doc comment saying it
 * must not be removed — which means a grep over the raw file passes even after the credit
 * has been deleted from the JSX, on the strength of the comment telling you not to delete
 * it. Strip them, so what is measured is what a reader sees.
 */
const stripComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

const has = (text, needle) =>
  typeof needle === "string"
    ? text.includes(needle.normalize("NFC"))
    : needle.test(text);

/**
 * Where the credit lives in the sources, and what each one has to contain.
 *
 * The components do not carry the URL as a literal — they go through EXTERNAL_URLS, which
 * is the point of `constants.ts` — so what is required of them is the reference, and the
 * URL itself is required once, at the definition.
 */
const SOURCES = [
  { file: "README.md", needs: [AUTHOR, ORIGIN] },
  { file: "LICENSE", needs: [AUTHOR, ORIGIN] },
  { file: "CONTRIBUTING.md", needs: [AUTHOR, ORIGIN] },
  { file: "package.json", needs: [AUTHOR, ORIGIN] },
  {
    file: "src/lib/constants.ts",
    needs: [/EL_UKULELE_VENECO:\s*"https:\/\/elukulelevene\.co"/],
  },
  { file: "src/app/layout.tsx", needs: [AUTHOR] },
  {
    file: "src/app/page.tsx",
    needs: [AUTHOR, /EXTERNAL_URLS\.EL_UKULELE_VENECO/],
  },
  { file: "src/app/not-found.tsx", needs: [AUTHOR] },
  {
    file: "src/components/Footer.tsx",
    needs: [AUTHOR, /EXTERNAL_URLS\.EL_UKULELE_VENECO/],
  },
  // The structural one. <Footer /> in the shell is what puts the credit on all 276 song
  // pages and on the list; move it into the individual routes and the next route added
  // will not have it.
  { file: "src/app/(app)/layout.tsx", needs: [/<Footer\s*\/>/] },
];

/**
 * The build output, if there is any.
 *
 * `_global-error.html` is deliberately absent from this: it is React's last-resort
 * boundary, it renders without the app shell by design, and requiring a credit on it
 * would mean putting one somewhere it can never be read. The 404 carries the author but
 * not the link — it is a dead end with a way back to the list, not a page anyone lands on
 * from outside.
 */
const BUILD_DIR = path.join(REPO_ROOT, ".next", "server", "app");

function renderedPages() {
  if (!fs.existsSync(BUILD_DIR)) return null;
  const pages = [];
  // Named one by one, and that is the weakness of this half: the song routes
  // below are walked, so a third one is covered for free, but a new top-level
  // route is invisible here until somebody remembers to add it. `afinador.html`
  // is the first one that had to be — the count going 555 → 556 is how you know
  // it is actually being read.
  for (const name of ["index.html", "list.html", "afinador.html"]) {
    const file = path.join(BUILD_DIR, name);
    if (fs.existsSync(file)) pages.push({ file, needs: [AUTHOR, ORIGIN] });
  }
  const notFound = path.join(BUILD_DIR, "_not-found.html");
  if (fs.existsSync(notFound)) pages.push({ file: notFound, needs: [AUTHOR] });

  // Both song routes, not just the sheet: `/song/<slug>` and `/song/<slug>/acordes` are
  // two prerendered documents per song, they are cached separately, and a reader offline
  // can be on either. Walking the tree also means a third song route added later is
  // covered without anyone remembering to come back here.
  const songs = path.join(BUILD_DIR, "song");
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort()) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // `<slug>.segments` holds the router's payload fragments, not a page.
        if (!entry.name.endsWith(".segments")) walk(file);
      } else if (entry.name.endsWith(".html")) {
        pages.push({ file, needs: [AUTHOR, ORIGIN] });
      }
    }
  };
  if (fs.existsSync(songs)) walk(songs);
  return pages;
}

function main() {
  const failures = [];

  for (const { file, needs } of SOURCES) {
    if (!fs.existsSync(path.join(REPO_ROOT, file))) {
      failures.push(`${file} — the file itself is gone`);
      continue;
    }
    const text = /\.tsx?$/.test(file) ? stripComments(read(file)) : read(file);
    for (const needle of needs) {
      if (!has(text, needle)) failures.push(`${file} — no ${needle}`);
    }
  }
  console.log(`  ${SOURCES.length} sources checked`);

  const pages = renderedPages();
  if (pages === null) {
    console.log(
      "  no build output — run this after `next build` to check the rendered pages too",
    );
  } else {
    for (const { file, needs } of pages) {
      const text = fs.readFileSync(file, "utf8").normalize("NFC");
      for (const needle of needs) {
        if (!has(text, needle)) {
          failures.push(`${path.relative(REPO_ROOT, file)} — no ${needle}`);
        }
      }
    }
    console.log(`  ${pages.length} rendered pages checked`);
  }

  if (failures.length === 0) {
    console.log(`\nThe credit to ${AUTHOR} is intact.`);
    return 0;
  }

  console.error(`\n${failures.length} place(s) no longer credit ${AUTHOR}:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  console.error(
    `\nThis is not a style rule. The cancionero is used with its author's permission,\n` +
      `and crediting him is the condition attached to it (vault DECISIONS.md 1). Put it\n` +
      `back rather than relaxing this check.`,
  );
  return 1;
}

process.exitCode = main();
