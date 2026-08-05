"use client";

/**
 * The instrument the whole app is drawn for, held above every route it reaches.
 *
 * **It sits above the header and not only above `<main>`**, which is where it
 * differs from `SongFiltersContext` beside it: the toggle is *in* the header,
 * and `/afinador` — which draws no chord diagram at all — is in scope too,
 * because the toggle switches the whole app rather than the diagrams (Iker,
 * 2026-08-05). One instrument is on screen at a time.
 *
 * **There is deliberately no pre-paint script, and that is the trade
 * `M15 · 2` named.** `src/lib/theme.ts` runs one because a flash of the wrong
 * background is a repaint and nothing else; the instrument changes *rendered
 * content*, and a blocking script cannot help with content React has not made
 * yet. So this reads storage on mount, the way `useTransposition` and
 * `AutoScrollBar` do, and the cost is one paint of the prerendered instrument
 * — the ukulele — before the reader's choice lands. What must not happen is the
 * first client render disagreeing with the markup it is hydrating, which is
 * exactly what seeding the initial state from `localStorage` would do.
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_INSTRUMENT_ID,
  type Instrument,
  type InstrumentId,
  instrumentById,
  readInstrumentId,
  writeInstrumentId,
} from "@/lib/instrument";

interface InstrumentContextType {
  instrument: Instrument;
  choose: (id: InstrumentId) => void;
  /** The other one — what the toggle switches to. */
  other: Instrument;
}

const InstrumentContext = createContext<InstrumentContextType | undefined>(
  undefined,
);

export function InstrumentProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<InstrumentId>(DEFAULT_INSTRUMENT_ID);

  useEffect(() => {
    setId(readInstrumentId());
  }, []);

  const choose = useCallback((next: InstrumentId) => {
    setId(next);
    writeInstrumentId(next);
  }, []);

  const value = useMemo(
    () => ({
      instrument: instrumentById(id),
      other: instrumentById(id === "ukulele" ? "cuatro" : "ukulele"),
      choose,
    }),
    [id, choose],
  );

  return (
    <InstrumentContext.Provider value={value}>
      {children}
    </InstrumentContext.Provider>
  );
}

export function useInstrument(): InstrumentContextType {
  const context = useContext(InstrumentContext);
  if (context === undefined) {
    throw new Error("useInstrument must be used within an InstrumentProvider");
  }
  return context;
}
