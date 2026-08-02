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
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Transposition } from "@/lib/transpose";
import {
  PRINTED_KEY,
  readTransposeShift,
  writeTransposeShift,
} from "@/lib/transposeChoice";

export interface TranspositionState {
  /** The key the sheet is in now. Never undefined: index 0 is always present. */
  current: Transposition;
  /** The key the book printed, for saying what the sheet has moved away from. */
  printed: Transposition;
  /** Every key this song can be played in, printed first. */
  offered: Transposition[];
  /** True when the sheet is not showing the book's page. */
  moved: boolean;
  choose: (semitones: number) => void;
}

export function useTransposition(
  slug: string,
  transpositions: Transposition[],
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

  const printed = transpositions[0];
  const current =
    transpositions.find((transposition) => transposition.semitones === shift) ??
    printed;

  return {
    current,
    printed,
    offered: transpositions,
    moved: current.semitones !== PRINTED_KEY,
    choose,
  };
}
