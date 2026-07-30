#!/usr/bin/env node
/**
 * extract-page.mjs — print one page of the source cancionero as text.
 *
 *   node scripts/extract-page.mjs 14            one book page, ready to transcribe
 *   node scripts/extract-page.mjs 14 --json     the same thing as JSON
 *   node scripts/extract-page.mjs --find "…"    look a page up by song title
 *   node scripts/extract-page.mjs --check       prove the page mapping over the whole book
 *
 * The source is `public/elukuleleveneco_2025_web.pdf`, and it is temporary: see
 * DECISIONS.md 4 in the vault. This script is scoped to die with it. Anything learned
 * from the PDF that has to outlive it belongs in songs/README.md or CLAUDE.md.
 *
 * No dependencies — node's own zlib is the only hard part.
 *
 * Two things are worth knowing before changing anything here:
 *
 * 1. Content-stream order is NOT page order. The PDF's /Kids array is shuffled, so
 *    walking objects in numeric order reads the front matter correctly and then drifts
 *    from the printed page numbers. Pages are resolved through the page tree, and the
 *    /PageLabels ranges turn a printed book page into an index into it. --check proves
 *    the result against the page number printed in each page's own footer.
 *
 * 2. The fonts are subsets with an arbitrary encoding, but they carry /ToUnicode CMaps,
 *    so nothing has to be guessed. The CMaps live inside object streams, which is why
 *    grepping the raw file for /ToUnicode finds nothing.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const DEFAULT_PDF = path.join(
  REPO_ROOT,
  "public",
  "elukuleleveneco_2025_web.pdf",
);

/* ------------------------------------------------------------------ objects */

/**
 * Index every object in the file.
 *
 * This rebuilds the cross-reference table by scanning for `N G obj` rather than parsing
 * the /XRef stream. It is the same thing every PDF reader falls back to on a damaged
 * file, it is a dozen lines instead of a hundred, and it cannot disagree with the bytes.
 * Objects that live inside /ObjStm containers are expanded on top of it.
 */
function loadPdf(pdfPath) {
  const bytes = fs.readFileSync(pdfPath);
  const text = bytes.toString("latin1");

  const offsets = new Map();
  const objRe = /(?:^|[\r\n>\s])(\d+)\s+(\d+)\s+obj\b/g;
  for (let m = objRe.exec(text); m; m = objRe.exec(text)) {
    offsets.set(
      Number(m[1]),
      objRe.lastIndex - m[0].length + m[0].indexOf(m[1]),
    );
  }

  const rawObject = (num) => {
    const start = offsets.get(num);
    if (start === undefined) return null;
    return text.slice(start, text.indexOf("endobj", start));
  };

  const streamOf = (num) => {
    const start = offsets.get(num);
    if (start === undefined) return null;
    const streamEnd = text.indexOf("endstream", start);
    const dictLength = text.slice(start, streamEnd).indexOf("stream");
    let body = start + dictLength + "stream".length;
    if (text[body] === "\r") body++;
    if (text[body] === "\n") body++;
    const dict = text.slice(start, start + dictLength);
    const raw = bytes.subarray(body, streamEnd);
    // /Length is often an indirect reference; inflating to the endstream marker with a
    // sync flush sidesteps having to resolve it.
    if (!/FlateDecode/.test(dict)) return raw.toString("latin1");
    return zlib
      .inflateSync(raw, { finishFlush: zlib.constants.Z_SYNC_FLUSH })
      .toString("latin1");
  };

  const inObjectStreams = new Map();
  for (const [num, start] of offsets) {
    // Only the object's own dictionary — a fixed-size window would run into the next
    // object and mistake its /Type for this one's.
    const head = text.slice(start, text.indexOf("stream", start));
    if (!/\/Type\s*\/ObjStm/.test(head)) continue;
    const count = Number(/\/N\s+(\d+)/.exec(head)[1]);
    const first = Number(/\/First\s+(\d+)/.exec(head)[1]);
    const body = streamOf(num);
    const pairs = body.slice(0, first).trim().split(/\s+/).map(Number);
    for (let i = 0; i < count; i++) {
      const from = first + pairs[2 * i + 1];
      const to = i + 1 < count ? first + pairs[2 * i + 3] : body.length;
      inObjectStreams.set(pairs[2 * i], body.slice(from, to));
    }
  }

  const object = (num) => inObjectStreams.get(num) ?? rawObject(num);
  return { text, object, streamOf };
}

const refIn = (source, key) => {
  const m = new RegExp(`/${key}\\s+(\\d+)\\s+\\d+\\s+R`).exec(source);
  return m ? Number(m[1]) : null;
};

/* -------------------------------------------------------------------- pages */

/** Flatten the page tree into an array of page objects, in printed order. */
function pageTree(pdf) {
  const root = pdf.object(refIn(pdf.text, "Root"));
  const pages = [];
  const walk = (num, depth) => {
    if (depth > 32) throw new Error("page tree too deep — is it a cycle?");
    const node = pdf.object(num);
    if (node === null)
      throw new Error(`page tree points at missing object ${num}`);
    if (/\/Type\s*\/Pages\b/.test(node)) {
      const kids = /\/Kids\s*\[([\s\S]*?)\]/.exec(node);
      for (const kid of kids[1].matchAll(/(\d+)\s+\d+\s+R/g))
        walk(Number(kid[1]), depth + 1);
    } else {
      pages.push({ index: pages.length, num, dict: node });
    }
  };
  walk(refIn(root, "Pages"), 0);
  return pages;
}

/**
 * Read /PageLabels and return the 0-based page index where decimal numbering restarts
 * for the body of the book. The cancionero labels its front matter separately, so book
 * page 1 is not PDF page 1, and the offset is stated in the file rather than guessed.
 */
function bodyPageOffset(pdf) {
  const root = pdf.object(refIn(pdf.text, "Root"));
  const nums = /\/PageLabels\s*<<\s*\/Nums\s*\[([\s\S]*?)\]\s*>>/.exec(root);
  if (!nums) return null;
  const ranges = [...nums[1].matchAll(/(\d+)\s*<<([\s\S]*?)>>/g)].map(
    ([, at, dict]) => ({
      at: Number(at),
      style: (/\/S\s*\/(\w)/.exec(dict) || [])[1],
      prefix: (/\/P\s*\(([^)]*)\)/.exec(dict) || [])[1] ?? "",
      start: Number((/\/St\s+(\d+)/.exec(dict) || [])[1] ?? 1),
    }),
  );
  // The body is the decimal range with no prefix and no page-number offset: the only one
  // whose labels are the bare numbers printed on the song pages.
  const body = ranges.find(
    (r) => r.style === "D" && r.prefix === "" && r.start === 1,
  );
  return body ? body.at : null;
}

/* --------------------------------------------------------------------- text */

/** Build cid → character from a font's /ToUnicode CMap. */
function toUnicodeMap(pdf, fontDict) {
  const map = new Map();
  const cmapRef = refIn(fontDict, "ToUnicode");
  if (cmapRef === null) return map;
  const cmap = pdf.streamOf(cmapRef);
  for (const [, lo, hi, dst] of cmap.matchAll(
    /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g,
  )) {
    const from = parseInt(lo, 16);
    const to = parseInt(hi, 16);
    const base = parseInt(dst, 16);
    for (let cid = from; cid <= to; cid++)
      map.set(cid, String.fromCodePoint(base + cid - from));
  }
  for (const [, src, dst] of cmap.matchAll(
    /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>(?!\s*<)/g,
  )) {
    map.set(parseInt(src, 16), String.fromCodePoint(parseInt(dst, 16)));
  }
  return map;
}

/** Build cid → advance width (1/1000 em) from a CIDFont's /W array and /DW default. */
function widthMap(descendant) {
  const widths = new Map();
  const dw = Number((/\/DW\s+(\d+)/.exec(descendant) || [])[1] ?? 1000);
  // /W nests arrays inside its own, so its end has to be counted rather than matched.
  const opens = /\/W\s*\[/.exec(descendant);
  let body = "";
  if (opens) {
    let depth = 0;
    for (
      let i = opens.index + opens[0].length - 1;
      i < descendant.length;
      i++
    ) {
      if (descendant[i] === "[") depth++;
      else if (descendant[i] === "]" && --depth === 0) break;
      else if (depth > 0) body += descendant[i];
    }
  }
  // Two forms interleave: `c [w w w]` and `cFirst cLast w`.
  const tokens = body
    .replace(/([[\]])/g, " $1 ")
    .trim()
    .split(/\s+/);
  for (let i = 0; i < tokens.length; ) {
    const first = Number(tokens[i++]);
    if (!Number.isFinite(first)) continue;
    if (tokens[i] === "[") {
      i++;
      for (let cid = first; tokens[i] !== "]" && i < tokens.length; cid++) {
        widths.set(cid, Number(tokens[i++]));
      }
      i++;
    } else {
      const last = Number(tokens[i++]);
      const w = Number(tokens[i++]);
      for (let cid = first; cid <= last; cid++) widths.set(cid, w);
    }
  }
  return { widths, dw };
}

function pageFonts(pdf, pageDict) {
  const fonts = {};
  const fontsRef = refIn(pageDict, "Font");
  const inline = /\/Font\s*<<([\s\S]*?)>>/.exec(pageDict);
  const source =
    fontsRef !== null ? pdf.object(fontsRef) : inline ? inline[1] : "";
  for (const [, name, num] of source.matchAll(/\/(\w+)\s+(\d+)\s+\d+\s+R/g)) {
    const dict = pdf.object(Number(num));
    if (!dict) continue;
    const descendantRef = /\/DescendantFonts\s*\[\s*(\d+)\s+\d+\s+R/.exec(dict);
    const descendant = descendantRef
      ? pdf.object(Number(descendantRef[1]))
      : "";
    fonts[name] = {
      chars: toUnicodeMap(pdf, dict),
      ...widthMap(descendant || ""),
    };
  }
  return fonts;
}

/** Split a content stream into [operands, operator] tuples. */
function* operations(stream) {
  const operands = [];
  let i = 0;
  const isSpace = (c) =>
    c === " " || c === "\n" || c === "\r" || c === "\t" || c === "\0";
  while (i < stream.length) {
    const c = stream[i];
    if (isSpace(c)) {
      i++;
    } else if (c === "%") {
      while (i < stream.length && stream[i] !== "\n") i++;
    } else if (c === "(") {
      let depth = 1;
      let out = "";
      i++;
      while (i < stream.length && depth > 0) {
        const ch = stream[i];
        if (ch === "\\") {
          const next = stream[i + 1];
          const octal = /^[0-7]{1,3}/.exec(stream.slice(i + 1, i + 4));
          if (octal) {
            out += String.fromCharCode(parseInt(octal[0], 8));
            i += 1 + octal[0].length;
          } else if (next === "n") {
            out += "\n";
            i += 2;
          } else if (next === "r") {
            out += "\r";
            i += 2;
          } else if (next === "t") {
            out += "\t";
            i += 2;
          } else if (next === "b") {
            out += "\b";
            i += 2;
          } else if (next === "f") {
            out += "\f";
            i += 2;
          } else if (next === "\n") {
            i += 2;
          } else {
            out += next;
            i += 2;
          }
        } else if (ch === "(") {
          depth++;
          out += ch;
          i++;
        } else if (ch === ")") {
          depth--;
          if (depth > 0) out += ch;
          i++;
        } else {
          out += ch;
          i++;
        }
      }
      operands.push({ string: out });
    } else if (c === "<" && stream[i + 1] !== "<") {
      const end = stream.indexOf(">", i);
      const hex = stream.slice(i + 1, end).replace(/\s+/g, "");
      let out = "";
      for (let h = 0; h < hex.length; h += 2) {
        out += String.fromCharCode(
          parseInt(hex.slice(h, h + 2).padEnd(2, "0"), 16),
        );
      }
      operands.push({ string: out });
      i = end + 1;
    } else if (c === "<" && stream[i + 1] === "<") {
      // Inline dictionary (BDC properties, and nothing else here). Skip it whole.
      let depth = 0;
      while (i < stream.length) {
        if (stream[i] === "<" && stream[i + 1] === "<") {
          depth++;
          i += 2;
        } else if (stream[i] === ">" && stream[i + 1] === ">") {
          depth--;
          i += 2;
          if (!depth) break;
        } else i++;
      }
      operands.push({ dict: true });
    } else if (c === "[") {
      operands.push({ arrayStart: true });
      i++;
    } else if (c === "]") {
      const items = [];
      while (operands.length && !operands[operands.length - 1].arrayStart)
        items.unshift(operands.pop());
      operands.pop();
      operands.push({ array: items });
      i++;
    } else if (c === "/") {
      const m = /^\/[^\s/[\]<>()%]*/.exec(stream.slice(i));
      operands.push({ name: m[0].slice(1) });
      i += m[0].length;
    } else {
      const m = /^[-+.\d]+/.exec(stream.slice(i));
      if (m) {
        operands.push({ number: Number(m[0]) });
        i += m[0].length;
      } else {
        const op = /^[^\s/[\]<>()%]+/.exec(stream.slice(i));
        if (!op) {
          i++;
          continue;
        }
        yield [operands.splice(0, operands.length), op[0]];
        i += op[0].length;
      }
    }
  }
}

const mul = (a, b) => [
  a[0] * b[0] + a[1] * b[2],
  a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2],
  a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4],
  a[4] * b[1] + a[5] * b[3] + b[5],
];
const apply = (m, x, y) => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
];

/**
 * Walk a page's content stream and return its text runs and its vector geometry.
 *
 * Every glyph run comes back with the device-space x it starts at and the x it ends at,
 * which is what lets the renderer put a chord back over the syllable it belongs to.
 */
function readPage(pdf, pageDict) {
  const fonts = pageFonts(pdf, pageDict);
  const contentsRef = refIn(pageDict, "Contents");
  const contentsArray = /\/Contents\s*\[([\s\S]*?)\]/.exec(pageDict);
  const parts =
    contentsRef !== null
      ? [contentsRef]
      : contentsArray
        ? [...contentsArray[1].matchAll(/(\d+)\s+\d+\s+R/g)].map((m) =>
            Number(m[1]),
          )
        : [];
  const stream = parts.map((n) => pdf.streamOf(n)).join("\n");

  const runs = [];
  const strokes = [];
  const fills = [];

  let ctm = [1, 0, 0, 1, 0, 0];
  const stack = [];
  let tm = null;
  let tlm = null;
  let font = null;
  let size = 0;
  let leading = 0;
  let charSpace = 0;
  let wordSpace = 0;
  let hScale = 1;
  // A path is a list of subpaths, and one `S` can stroke dozens of them — the chord
  // grids are drawn as a single path holding every string and fret line. Keeping them
  // apart is the whole reason the diagrams can be read back.
  let subpaths = [];
  let current = [];

  const show = (text) => {
    if (!font || !tm) return;
    const glyph = fonts[font];
    let out = "";
    let advance = 0;
    for (let i = 0; i + 1 < text.length; i += 2) {
      const cid = (text.charCodeAt(i) << 8) | text.charCodeAt(i + 1);
      const ch = glyph?.chars.get(cid);
      out += ch ?? "�";
      const w = (glyph?.widths.get(cid) ?? glyph?.dw ?? 1000) / 1000;
      advance += (w * size + charSpace + (ch === " " ? wordSpace : 0)) * hScale;
    }
    const [x, y] = apply(mul(tm, ctm), 0, 0);
    const [xEnd] = apply(mul(tm, ctm), advance, 0);
    if (out.length) runs.push({ x, y, xEnd, size, font, text: out });
    tm = mul([1, 0, 0, 1, advance, 0], tm);
  };

  const moveTo = (point) => {
    if (current.length) subpaths.push(current);
    current = [point];
  };

  const endPath = (kind) => {
    if (current.length) subpaths.push(current);
    if (kind) {
      const into = kind === "S" ? strokes : fills;
      for (const points of subpaths) {
        const xs = points.map((p) => p[0]);
        const ys = points.map((p) => p[1]);
        into.push({
          x0: Math.min(...xs),
          x1: Math.max(...xs),
          y0: Math.min(...ys),
          y1: Math.max(...ys),
        });
      }
    }
    subpaths = [];
    current = [];
  };

  for (const [args, op] of operations(stream)) {
    const n = (i) => args[i]?.number ?? 0;
    switch (op) {
      case "q":
        stack.push(ctm);
        break;
      case "Q":
        ctm = stack.pop() ?? ctm;
        break;
      case "cm":
        ctm = mul([n(0), n(1), n(2), n(3), n(4), n(5)], ctm);
        break;
      case "BT":
        tm = [1, 0, 0, 1, 0, 0];
        tlm = tm;
        break;
      case "ET":
        tm = null;
        tlm = null;
        break;
      case "Tf":
        font = args[0]?.name ?? font;
        size = n(1);
        break;
      case "TL":
        leading = n(0);
        break;
      case "Tc":
        charSpace = n(0);
        break;
      case "Tw":
        wordSpace = n(0);
        break;
      case "Tz":
        hScale = n(0) / 100;
        break;
      case "Tm":
        tm = [n(0), n(1), n(2), n(3), n(4), n(5)];
        tlm = tm;
        break;
      case "Td":
        tlm = mul([1, 0, 0, 1, n(0), n(1)], tlm ?? [1, 0, 0, 1, 0, 0]);
        tm = tlm;
        break;
      case "TD":
        leading = -n(1);
        tlm = mul([1, 0, 0, 1, n(0), n(1)], tlm ?? [1, 0, 0, 1, 0, 0]);
        tm = tlm;
        break;
      case "T*":
        tlm = mul([1, 0, 0, 1, 0, -leading], tlm ?? [1, 0, 0, 1, 0, 0]);
        tm = tlm;
        break;
      case "Tj":
        show(args[0]?.string ?? "");
        break;
      case "'":
        tlm = mul([1, 0, 0, 1, 0, -leading], tlm ?? [1, 0, 0, 1, 0, 0]);
        tm = tlm;
        show(args[0]?.string ?? "");
        break;
      case '"':
        wordSpace = n(0);
        charSpace = n(1);
        tlm = mul([1, 0, 0, 1, 0, -leading], tlm ?? [1, 0, 0, 1, 0, 0]);
        tm = tlm;
        show(args[2]?.string ?? "");
        break;
      case "TJ":
        for (const item of args[0]?.array ?? []) {
          if (item.string !== undefined) show(item.string);
          else if (item.number !== undefined) {
            tm = mul(
              [1, 0, 0, 1, (-item.number / 1000) * size * hScale, 0],
              tm ?? [1, 0, 0, 1, 0, 0],
            );
          }
        }
        break;
      case "m":
        moveTo(apply(ctm, n(0), n(1)));
        break;
      case "l":
        current.push(apply(ctm, n(0), n(1)));
        break;
      case "c":
        current.push(
          apply(ctm, n(0), n(1)),
          apply(ctm, n(2), n(3)),
          apply(ctm, n(4), n(5)),
        );
        break;
      case "v":
      case "y":
        current.push(apply(ctm, n(0), n(1)), apply(ctm, n(2), n(3)));
        break;
      case "re":
        moveTo(apply(ctm, n(0), n(1)));
        current.push(
          apply(ctm, n(0) + n(2), n(1)),
          apply(ctm, n(0) + n(2), n(1) + n(3)),
          apply(ctm, n(0), n(1) + n(3)),
        );
        break;
      case "S":
      case "s":
        endPath("S");
        break;
      case "f":
      case "F":
      case "f*":
      case "B":
      case "B*":
      case "b":
      case "b*":
        endPath("f");
        break;
      case "n":
        endPath(null);
        break;
      default:
        break;
    }
  }
  return { runs, strokes, fills };
}

/* ----------------------------------------------------------- chord diagrams */

const STRING_NAMES = ["G", "C", "E", "A"]; // low to high, the order `positions` uses

/**
 * Recover the chord diagrams drawn in the right margin as 4-digit `positions` strings.
 *
 * Each diagram is a grid: four vertical string lines crossed by evenly spaced fret
 * lines, with a filled dot per stopped string. A string with no dot is open. The book
 * never draws open-circle or muted markers, so absence is unambiguous.
 *
 * The nut is drawn as a band of hairlines just above the grid, so the fret ladder is
 * taken as the longest evenly spaced run of horizontal lines rather than "all of them".
 */
function chordDiagrams({ runs, strokes, fills }) {
  const horizontal = [];
  const vertical = [];
  for (const s of strokes) {
    const w = s.x1 - s.x0;
    const h = s.y1 - s.y0;
    if (h < 0.5 && w > 8) horizontal.push(s);
    else if (w < 0.5 && h > 8) vertical.push(s);
  }

  // Group the string lines into diagrams: a row is every line sharing a y-range, and a
  // row holds as many diagrams as fit across the margin, so it is cut again wherever the
  // horizontal gap jumps well past the string spacing.
  const rows = [];
  for (const line of vertical) {
    const row = rows.find(
      (r) => Math.abs(r.y1 - line.y1) < 2 && Math.abs(r.y0 - line.y0) < 2,
    );
    if (row) row.xs.push(line.x0);
    else rows.push({ y0: line.y0, y1: line.y1, xs: [line.x0] });
  }

  const groups = [];
  for (const row of rows) {
    const xs = [...new Set(row.xs.map((x) => Math.round(x * 10) / 10))].sort(
      (a, b) => a - b,
    );
    const gaps = xs.slice(1).map((x, i) => x - xs[i]);
    const spacing = gaps.length
      ? gaps.slice().sort((a, b) => a - b)[Math.floor(gaps.length / 2)]
      : 0;
    let cut = [xs[0]];
    for (let i = 1; i <= xs.length; i++) {
      if (i < xs.length && xs[i] - xs[i - 1] < spacing * 1.8) {
        cut.push(xs[i]);
        continue;
      }
      groups.push({
        xs: cut,
        x0: cut[0],
        x1: cut[cut.length - 1],
        y0: row.y0,
        y1: row.y1,
      });
      cut = [xs[i]];
    }
  }

  const diagrams = [];
  for (const g of groups) {
    const strings = g.xs;
    if (strings.length !== 4) continue;

    // The fret ladder: horizontal lines crossing this grid, kept only where they are
    // evenly spaced. This drops the nut band and any barre bar.
    const ys = [
      ...new Set(
        horizontal
          .filter(
            (h) =>
              h.x0 < strings[0] + 2 &&
              h.x1 > strings[3] - 2 &&
              h.y0 <= g.y1 + 4 &&
              h.y0 >= g.y0 - 4,
          )
          .map((h) => Math.round(h.y0 * 10) / 10),
      ),
    ].sort((a, b) => b - a);
    let ladder = [];
    for (let i = 0; i < ys.length; i++) {
      for (let j = i + 1; j < ys.length; j++) {
        const step = ys[i] - ys[j];
        if (step < 3) continue;
        const run = [ys[i]];
        for (let k = j; k < ys.length; k++) {
          if (Math.abs(ys[k] - (run[run.length - 1] - step)) < 0.6)
            run.push(ys[k]);
        }
        if (run.length > ladder.length) ladder = run;
      }
    }
    if (ladder.length < 2) continue;
    const top = ladder[0];
    const step = ladder[0] - ladder[1];

    // A diagram anchored at the nut draws it as a band of hairlines just above the grid.
    // Without that band the grid starts further up the neck, and the book prints the
    // number of the first visible fret in small type to the left of it.
    const nutted = horizontal.some(
      (h) =>
        h.y0 > top + 0.3 &&
        h.y0 < top + step / 2 &&
        h.x0 < strings[0] + 2 &&
        h.x1 > strings[3] - 2,
    );
    const marker = runs.find(
      (r) =>
        r.xEnd <= strings[0] &&
        r.x > strings[0] - 14 &&
        r.y < top &&
        r.y > ladder[ladder.length - 1] &&
        /^\d+$/.test(r.text.trim()),
    );
    const base = nutted ? 0 : marker ? Number(marker.text.trim()) - 1 : 0;

    const positions = [0, 0, 0, 0];
    let unreadable = !nutted && !marker;
    for (const dot of fills) {
      const cx = (dot.x0 + dot.x1) / 2;
      const cy = (dot.y0 + dot.y1) / 2;
      if (cy > top + 1 || cy < ladder[ladder.length - 1] - 1) continue;
      const s = strings.findIndex((x) => Math.abs(x - cx) < step / 2);
      if (s < 0) continue;
      const fret = Math.round((top - cy) / step + 0.5) + base;
      if (fret >= 1) positions[s] = Math.max(positions[s], fret);
      if (fret > 9) unreadable = true; // `positions` is four digits and has no room
    }

    // The chord's name sits directly above the grid.
    const label = runs
      .filter(
        (r) =>
          r.y > top && r.y < top + 14 && r.xEnd > g.x0 - 6 && r.x < g.x1 + 6,
      )
      .sort((a, b) => a.y - b.y || a.x - b.x)[0];

    diagrams.push({
      name: label ? label.text.trim() : "?",
      positions: unreadable ? null : positions.join(""),
      box: { x0: g.x0, x1: g.x1, y0: g.y0, y1: top + 14 },
    });
  }
  diagrams.sort((a, b) => b.box.y1 - a.box.y1 || a.box.x0 - b.box.x0);
  return diagrams;
}

/* ------------------------------------------------------------------- layout */

/** Gather runs sharing a baseline, in reading order. */
function baselines(runs) {
  const lines = [];
  for (const run of [...runs].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const line = lines.find((l) => Math.abs(l.y - run.y) < 2.5);
    if (line) line.runs.push(run);
    else lines.push({ y: run.y, runs: [run] });
  }
  for (const line of lines) line.runs.sort((a, b) => a.x - b.x);
  return lines.sort((a, b) => b.y - a.y);
}

/**
 * Fold one baseline's runs back into a string.
 *
 * Runs are simply concatenated: the typesetter emits a chord as its own run at the exact
 * x of the syllable it sits on, so joining them reproduces ChordPro source —
 * `Detén[A] la no[F#m]che` — with no alignment work at all. Only a real horizontal gap
 * becomes spaces, which is what keeps strumming patterns readable.
 */
function joinRuns(runs, space = 5) {
  let text = "";
  let pen = runs[0].x;
  for (const run of runs) {
    const gap = run.x - pen;
    if (gap > space * 0.6)
      text += " ".repeat(Math.max(1, Math.round(gap / space)));
    text += run.text;
    pen = run.xEnd;
  }
  return text.replace(/\s+$/, "");
}

const layout = (runs) =>
  baselines(runs).map((line) => ({
    y: line.y,
    x: line.runs[0].x,
    text: joinRuns(line.runs),
  }));

/**
 * Find the x where a second column of text starts, or null on a single-column page.
 *
 * A song too long for one page is set in two columns, and reading such a page across
 * rather than down interleaves two halves of a verse into nonsense. A column boundary
 * shows up as the same x recurring as the first run after a wide gap, line after line.
 */
function columnBreak(lines) {
  const starts = new Map();
  for (const line of lines) {
    for (let i = 1; i < line.runs.length; i++) {
      if (line.runs[i].x - line.runs[i - 1].xEnd < 40) continue;
      const at = Math.round(line.runs[i].x);
      starts.set(at, (starts.get(at) ?? 0) + 1);
      break;
    }
  }
  const [best] = [...starts].sort((a, b) => b[1] - a[1]);
  return best && best[1] >= 5 ? best[0] : null;
}

/* ---------------------------------------------------------------- one page */

/** Everything worth knowing about one page of the book. */
function extract(pdf, page) {
  const { runs, strokes, fills } = readPage(pdf, page.dict);
  const diagrams = chordDiagrams({ runs, strokes, fills });

  const media =
    /\/MediaBox\s*\[\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/.exec(
      page.dict,
    );
  const top = media ? Number(media[4]) : 842;

  // Runs belonging to a chord diagram's label or base-fret number are not body text.
  const inDiagram = (r) =>
    diagrams.some(
      (d) =>
        r.x > d.box.x0 - 8 &&
        r.x < d.box.x1 + 30 &&
        r.y > d.box.y0 - 2 &&
        r.y < d.box.y1,
    );

  // The masthead is the title line and the credit under it; the colophon at the foot
  // carries the printed page number. Both sit outside the type area the songs use.
  const masthead = top - 60;
  const colophon = 30;
  const header = layout(runs.filter((r) => r.y > masthead && !inDiagram(r)));
  const footer = layout(runs.filter((r) => r.y < colophon && !inDiagram(r)));
  const bodyLines = baselines(
    runs.filter((r) => r.y <= masthead && r.y >= colophon && !inDiagram(r)),
  );

  // Two-column pages are read down each column, not across the page.
  const column = columnBreak(bodyLines);
  const body = column
    ? [
        ...layoutSide(bodyLines, (r) => r.x < column - 1),
        ...layoutSide(bodyLines, (r) => r.x >= column - 1),
      ]
    : bodyLines.map((l) => ({
        y: l.y,
        x: l.runs[0].x,
        text: joinRuns(l.runs),
      }));

  // The masthead reads `<key> | <time signature>`, optionally `| <capo fret>` after a
  // small capo icon, then a wide gap and the title. A song too long for one page runs
  // on to the next, and the continuation carries no masthead at all.
  const titleLine = header[0]?.text ?? "";
  const parts =
    /^(.+?)\s*\|\s*(\d+\/\d+)\s*(?:\|\s*(\d+))?(?:\s{2,}(.*))?$/.exec(
      titleLine,
    );
  const printedPage = Number(
    footer
      .at(-1)
      ?.text.trim()
      .match(/(\d+)$/)?.[1] ?? Number.NaN,
  );

  return {
    pdfPage: page.index + 1,
    printedPage: Number.isNaN(printedPage) ? null : printedPage,
    continuation: header.length === 0,
    key: parts?.[1]?.trim() ?? null,
    timeSignature: parts?.[2] ?? null,
    capo: parts?.[3] ? Number(parts[3]) : null,
    title: parts?.[4]?.trim() || (titleLine.trim() ? titleLine.trim() : null),
    credit: header[1]?.text.trim() ?? null,
    columns: column ? 2 : 1,
    chords: diagrams,
    body,
  };
}

const layoutSide = (lines, keep) =>
  lines
    .map((l) => ({ y: l.y, runs: l.runs.filter(keep) }))
    .filter((l) => l.runs.length)
    .map((l) => ({ y: l.y, x: l.runs[0].x, text: joinRuns(l.runs) }));

/* --------------------------------------------------------------------- CLI */

/** Fold a title down to something two spellings of it will agree on. */
const normalise = (title) =>
  title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function render(page) {
  const out = [];
  out.push(
    `# book page ${page.printedPage ?? "?"}   (PDF page ${page.pdfPage})`,
  );
  if (page.continuation) {
    out.push("# no masthead — this page continues the song before it");
  }
  if (page.columns === 2) {
    out.push(
      "# set in two columns — printed below as the left column, then the right",
    );
  }
  out.push("");
  if (page.title) out.push(`title:         ${page.title}`);
  if (page.credit) out.push(`credit:        ${page.credit}`);
  if (page.key) out.push(`key:           ${page.key}`);
  if (page.timeSignature) out.push(`timeSignature: ${page.timeSignature}`);
  if (page.capo !== null)
    out.push(
      `# capo:        ${page.capo} — the book prints this; the song format has no field for it`,
    );
  if (page.chords.length) {
    out.push("");
    out.push("chords:");
    for (const c of page.chords) {
      out.push(`  - name: ${c.name}`);
      out.push(
        c.positions === null
          ? "    positions: # unreadable — read this one off the page yourself"
          : `    positions: "${c.positions}"`,
      );
    }
  }
  out.push("");
  out.push("-".repeat(72));
  out.push("");
  let previous = null;
  for (const line of page.body) {
    if (previous !== null && previous - line.y > 20) out.push("");
    out.push(line.text);
    previous = line.y;
  }
  return out.join("\n");
}

function main(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const rest = argv.filter((a) => !a.startsWith("--"));
  const pdfArg = argv.indexOf("--pdf");
  const pdfPath = pdfArg >= 0 ? argv[pdfArg + 1] : DEFAULT_PDF;

  if (!fs.existsSync(pdfPath)) {
    console.error(`No PDF at ${pdfPath}`);
    console.error(
      "The source is temporary by design — see DECISIONS.md 4 in the vault.",
    );
    return 1;
  }

  const pdf = loadPdf(pdfPath);
  const pages = pageTree(pdf);
  const offset = bodyPageOffset(pdf);
  if (offset === null) {
    console.error(
      "This PDF has no /PageLabels, so book pages cannot be resolved.",
    );
    return 1;
  }

  if (flags.has("--check")) {
    // Read every page and hold the result up against what the page itself says. The
    // mapping check is the important one: it is the failure that would otherwise be
    // silent, handing back a confident transcription of the wrong song.
    const tally = {
      pages: 0,
      misnumbered: 0,
      chords: 0,
      unreadable: 0,
      untitled: 0,
      wide: 0,
    };
    for (let book = 1; offset + book - 1 < pages.length; book++) {
      const page = pages[offset + book - 1];
      const song = extract(pdf, page);
      if (song.printedPage === null) break; // past the last numbered page
      tally.pages++;
      if (song.printedPage !== book) {
        tally.misnumbered++;
        console.log(
          `  page ${book} → PDF page ${page.index + 1}, but its footer says ${song.printedPage}`,
        );
      }
      if (!song.title && !song.continuation) {
        tally.untitled++;
        console.log(`  page ${book} has no readable masthead`);
      }
      if (song.columns === 2) tally.wide++;
      for (const chord of song.chords) {
        tally.chords++;
        if (chord.positions === null) {
          tally.unreadable++;
          console.log(
            `  page ${book}: could not read the diagram for ${chord.name}`,
          );
        }
      }
    }
    console.log(
      `${tally.pages} numbered pages, ${tally.chords} chord diagrams.\n` +
        `${tally.misnumbered} misnumbered, ${tally.untitled} without a masthead, ` +
        `${tally.unreadable} unreadable diagrams, ${tally.wide} set in two columns.`,
    );
    return tally.misnumbered + tally.untitled + tally.unreadable === 0 ? 0 : 1;
  }

  // `--find` exists because the book's index numbers songs and this script wants pages,
  // and the two stop agreeing at page 197, where one song takes two pages. Anything
  // working from a list of titles should look the page up rather than count to it.
  if (flags.has("--find")) {
    const wanted = normalise(argv[argv.indexOf("--find") + 1] ?? "");
    if (!wanted) {
      console.error(
        'Usage: node scripts/extract-page.mjs --find "<song title>"',
      );
      return 1;
    }
    const hits = [];
    for (let book = 1; offset + book - 1 < pages.length; book++) {
      const song = extract(pdf, pages[offset + book - 1]);
      if (song.printedPage === null) break;
      if (song.title && normalise(song.title).includes(wanted)) {
        hits.push({ book, song });
      }
    }
    if (hits.length === 0) {
      console.error(
        `Nothing in the book matches “${argv[argv.indexOf("--find") + 1]}”.`,
      );
      return 1;
    }
    if (hits.length > 1) {
      console.error(`${hits.length} songs match — say which:`);
      for (const hit of hits) {
        console.error(
          `  page ${hit.book}: ${hit.song.title} — ${hit.song.credit}`,
        );
      }
      return 1;
    }
    console.log(
      flags.has("--json")
        ? JSON.stringify(hits[0].song, null, 2)
        : render(hits[0].song),
    );
    return 0;
  }

  const book = Number(rest[rest.length - 1]);
  if (!Number.isInteger(book) || book < 1) {
    console.error(
      'Usage: node scripts/extract-page.mjs <book page> | --find "<title>" [--json] [--check]',
    );
    return 1;
  }
  const page = pages[offset + book - 1];
  if (!page) {
    console.error(
      `Book page ${book} is past the end of the PDF (${pages.length} pages).`,
    );
    return 1;
  }
  const result = extract(pdf, page);
  if (result.printedPage !== null && result.printedPage !== book) {
    console.error(
      `Refusing to print: asked for book page ${book}, but that page's footer says ` +
        `${result.printedPage}. Run --check.`,
    );
    return 1;
  }
  console.log(
    flags.has("--json") ? JSON.stringify(result, null, 2) : render(result),
  );
  return 0;
}

process.exitCode = main(process.argv.slice(2));
