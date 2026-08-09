"use client";

/**
 * The four filters on `/list`, held above the route that draws them.
 *
 * **This is the whole of BUG-017 and the reason it cannot move back into
 * `SongList`.** The four values used to be `useState` in that component, which
 * is a client component *inside* `/list`: opening a song unmounts that route's
 * subtree, React state goes with it, and pressing *Volver* re-runs the four
 * initialisers. So the reader filtered to fácil, tried a song, came back to all
 * 276 — on the one loop the screen exists for, which is filter, open, back,
 * open the next one.
 *
 * `/list` and `/song/<slug>` are both under `src/app/(app)/`, and a layout does
 * not remount when one of its children navigates to another. Holding the values
 * in a provider *there* is therefore the entire fix: nothing restores them,
 * because nothing ever unmounted them. There is no effect, no storage read and
 * no hydration mismatch, and the list comes back filtered on its first render
 * rather than flashing 276 rows and then correcting itself.
 *
 * **The URL is the answer the next reader will propose, and it was measured and
 * rejected.** `?dificultad=facil` would survive a reload and a share as well as
 * a back — but the service worker keys its cache by the full URL, so it turns a
 * list page that opens with no signal into one that opens in some filter states
 * and not others. Un-breaking that means `ignoreSearch` on the catch-all
 * `NetworkFirst` rule, which is the load-bearing one, in the config M12 is about
 * to replace wholesale. It also costs `/list` its static prerender, since
 * `useSearchParams` in a prerendered route wants a Suspense boundary around the
 * table.
 *
 * What this deliberately does *not* survive is a reload, or a trip out to `/`
 * and back — the landing sits outside `(app)`, so the provider unmounts with it.
 * That line is intended: back is *return to where I was*, reload is *start
 * over*.
 */

import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { Difficulty } from "@/lib/difficulty";

interface SongFiltersContextType {
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  keyFilter: string;
  setKeyFilter: Dispatch<SetStateAction<string>>;
  artistFilter: string;
  setArtistFilter: Dispatch<SetStateAction<string>>;
  /**
   * The empty string is "no band chosen", the same shape the two comboboxes
   * use, so `hasFilters` and `clearFilters` can treat all four alike.
   */
  difficultyFilter: Difficulty | "";
  setDifficultyFilter: Dispatch<SetStateAction<Difficulty | "">>;
  /**
   * Show only the songs saved to the phone.
   *
   * A boolean where the other four are strings, because this one does not
   * choose among values — the set it selects by is `offlineSongs`, which lives
   * in `OfflineSongsContext` and is deliberately not copied here.
   *
   * **It must default to `false`.** That set fills from IndexedDB in an effect,
   * so it is empty on the list's first render; a filter that started on would
   * show an empty table until the read landed and then fill it in.
   */
  savedOnly: boolean;
  setSavedOnly: Dispatch<SetStateAction<boolean>>;
  /** Whether anything is narrowing the list — what shows *Limpiar filtros*. */
  hasFilters: boolean;
  clearFilters: () => void;
}

const SongFiltersContext = createContext<SongFiltersContextType | undefined>(
  undefined,
);

export function SongFiltersProvider({ children }: { children: ReactNode }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [keyFilter, setKeyFilter] = useState<string>("");
  const [artistFilter, setArtistFilter] = useState<string>("");
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | "">("");
  const [savedOnly, setSavedOnly] = useState(false);

  // `hasFilters` and `clearFilters` live here rather than in the list because
  // this is where the cleared state is defined: a fifth filter is then one
  // edit, in the file that would have to change anyway, instead of three that
  // can be made separately and drift.
  //
  // M16 was that fifth filter, and it was that one edit.
  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setKeyFilter("");
    setArtistFilter("");
    setDifficultyFilter("");
    setSavedOnly(false);
  }, []);

  const value = useMemo(
    () => ({
      searchTerm,
      setSearchTerm,
      keyFilter,
      setKeyFilter,
      artistFilter,
      setArtistFilter,
      difficultyFilter,
      setDifficultyFilter,
      savedOnly,
      setSavedOnly,
      hasFilters:
        searchTerm !== "" ||
        keyFilter !== "" ||
        artistFilter !== "" ||
        difficultyFilter !== "" ||
        savedOnly,
      clearFilters,
    }),
    [
      searchTerm,
      keyFilter,
      artistFilter,
      difficultyFilter,
      savedOnly,
      clearFilters,
    ],
  );

  return (
    <SongFiltersContext.Provider value={value}>
      {children}
    </SongFiltersContext.Provider>
  );
}

export function useSongFilters(): SongFiltersContextType {
  const context = useContext(SongFiltersContext);
  if (context === undefined) {
    throw new Error("useSongFilters must be used within a SongFiltersProvider");
  }
  return context;
}
