"use client";

/**
 * The key one song is currently in, shared by the two screens that print its
 * chords.
 *
 * The sheet and `/song/<slug>/acordes` are separate routes with separate React
 * trees, and both draw the same song's chords. They agree because they read the
 * same `localStorage` key through this hook rather than because anything is
 * passed between them — which is also why moving between them keeps the key the
 * reader picked.
 *
 * **The choice is one per song and not one per song and instrument**, which is
 * `M15 · Verification`'s "toggle back mid-song and nothing is lost but the
 * shapes". The two instruments offer different *sets* of keys, though, so a
 * shift stored under one can be unoffered under the other; `current` falls back
 * without touching what is stored, so toggling away and back returns the reader
 * to the key they chose.
 *
 * **The printed key is a string here rather than `transpositions[0]`, and that
 * is M15 arriving.** On the ukulele the book's own key is always offered and is
 * always first. On the cuatro it is offered for 236 songs of 276 — the other 40
 * want a chord the cancionero never draws a tone below — so index 0 is whatever
 * the lowest playable shift happens to be, and reading the printed key off it
 * would have the screen naming a key the book never printed as the original.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Transposition } from "@/lib/transpose";
import {
  PRINTED_KEY,
  readTransposeShift,
  writeTransposeShift,
} from "@/lib/transposeChoice";

export interface TranspositionState {
  /** The key the sheet is in now. Never undefined: the list is never empty. */
  current: Transposition;
  /** The written key the book printed, for saying what the sheet moved from. */
  printedKey: string;
  /** Every key this song can be played in on this instrument, lowest first. */
  offered: Transposition[];
  /** True when the sheet is not showing the book's own key. */
  moved: boolean;
  /**
   * True when the book's key is not among the offered ones at all — 40 songs in
   * cuatro mode, none in ukulele mode. The screen owes the reader a sentence
   * about the cancionero rather than a control that quietly starts somewhere
   * else.
   */
  printedKeyUnavailable: boolean;
  choose: (semitones: number) => void;
}

export function useTransposition(
  slug: string,
  transpositions: Transposition[],
  printedKey: string,
): TranspositionState {
  const [shift, setShift] = useState(PRINTED_KEY);

  const offeredShifts = useMemo(
    () => transpositions.map((transposition) => transposition.semitones),
    [transpositions],
  );

  // Read on mount rather than in the initial state, for the reason
  // `AutoScrollBar` gives: these pages are prerendered in the printed key, and
  // seeding from `localStorage` would make the first client render disagree
  // with the markup it is hydrating. The cost is one paint in the book's key
  // before the reader's choice lands, which on a song sheet is the right way
  // round anyway.
  //
  // The stored shift is deliberately read against the *ukulele's* offered set
  // as well as this one — `readTransposeShift` takes what is offered here, so
  // an instrument that cannot play the stored key lands on the fallback below
  // without the stored value being rewritten.
  useEffect(() => {
    setShift(readTransposeShift(slug, offeredShifts));
  }, [slug, offeredShifts]);

  const choose = useCallback(
    (semitones: number) => {
      setShift(semitones);
      writeTransposeShift(slug, semitones);
    },
    [slug],
  );

  const printed = transpositions.find(
    (transposition) => transposition.semitones === PRINTED_KEY,
  );

  // The book's key when this instrument can draw it, else the lowest shift it
  // can — which is printed+2 on the cuatro, the book's page unchanged.
  const fallback = printed ?? transpositions[0];
  const current =
    transpositions.find((transposition) => transposition.semitones === shift) ??
    fallback;

  return {
    current,
    printedKey,
    offered: transpositions,
    moved: current.semitones !== PRINTED_KEY,
    printedKeyUnavailable: printed === undefined,
    choose,
  };
}
