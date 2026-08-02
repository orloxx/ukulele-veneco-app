"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FilterCombobox, foldForSearch } from "@/components/FilterCombobox";
import { IconCheck, IconSearch } from "@/components/icons";
import {
  parsedSongToStoredSong,
  useOfflineSongs,
} from "@/contexts/OfflineSongsContext";
import {
  DIFFICULTY_BANDS,
  type Difficulty,
  difficultyLabel,
  songDifficulty,
} from "@/lib/difficulty";
import { OFFLINE_SAVE_CONCURRENCY } from "@/lib/offlinePages";
import type { ParsedSong } from "@/types/song";

interface SongListProps {
  songs: ParsedSong[];
}

/**
 * The ring that says this row is working.
 *
 * It is drawn *around* the checkbox rather than beside it, and the box is not
 * removed while it spins: a spinner in a 78px column that pushes the box aside
 * makes 276 rows jitter as they tick over one by one, and swapping the input
 * out drops keyboard focus to the top of the document mid-save.
 */
function SavingRing({ label }: { label: string }) {
  return (
    <>
      <span className="uv-check__spinner" aria-hidden="true" />
      <span className="uv-sr-only">{label}</span>
    </>
  );
}

/**
 * One cell of the table.
 *
 * Every cell except the checkbox is a link to the song, so the whole row is a
 * target — which is the only reason the 18px checkbox is allowed to be under
 * `--touch-min`.
 */
function SongCell({
  slug,
  children,
  className,
}: {
  slug: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td>
      <Link href={`/song/${slug}`} className={className}>
        {children}
      </Link>
    </td>
  );
}

export default function SongList({ songs }: SongListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [keyFilter, setKeyFilter] = useState<string>("");
  const [artistFilter, setArtistFilter] = useState<string>("");
  // The empty string is "no band chosen", the same shape the two comboboxes
  // use, so `hasFilters` and `resetFilters` treat all four alike.
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | "">("");

  const { offlineSongs, savingSlugs, saveSong, removeSong } = useOfflineSongs();
  // Which way the header checkbox is running, not just that it is: the two
  // read differently to a screen reader, and "guardando" over a run that is
  // removing songs is the same lie the checkbox used to tell (BUG-012).
  const [bulkAction, setBulkAction] = useState<"save" | "remove" | null>(null);
  const isBulkRunning = bulkAction !== null;

  // Get unique values for filters
  const uniqueKeys = useMemo(() => {
    const keys = new Set(
      songs.map((song) => song.metadata.key).filter(Boolean),
    );
    return Array.from(keys).sort();
  }, [songs]);

  const uniqueArtists = useMemo(() => {
    const artists = new Set(songs.map((song) => song.metadata.artist));
    return Array.from(artists).sort();
  }, [songs]);

  // Filtering stays client-side over the in-memory array: 276 songs is nothing,
  // and there is no reason for it to be anything cleverer.
  //
  // The search box folds accents for the same reason the artista combobox
  // beside it does, and through the same function: the two sit on one row over
  // one collection, and a "simon" that finds Simón Díaz in one of them and
  // nothing in the other is worse than neither doing it.
  const filteredSongs = useMemo(() => {
    const needle = foldForSearch(searchTerm);
    return songs.filter((song) => {
      const matchesSearch =
        needle === "" ||
        foldForSearch(song.metadata.title).includes(needle) ||
        foldForSearch(song.metadata.artist).includes(needle);

      const matchesKey = keyFilter === "" || song.metadata.key === keyFilter;

      const matchesArtist =
        artistFilter === "" || song.metadata.artist === artistFilter;

      // The count is the frontmatter's own distinct-chord list, so this asks
      // the same question the chip in the row answers — one function, and no
      // second copy of the band boundaries.
      const matchesDifficulty =
        difficultyFilter === "" ||
        songDifficulty(song.metadata.chords.length) === difficultyFilter;

      return matchesSearch && matchesKey && matchesArtist && matchesDifficulty;
    });
  }, [songs, searchTerm, keyFilter, artistFilter, difficultyFilter]);

  const hasFilters =
    searchTerm !== "" ||
    keyFilter !== "" ||
    artistFilter !== "" ||
    difficultyFilter !== "";

  const resetFilters = () => {
    setSearchTerm("");
    setKeyFilter("");
    setArtistFilter("");
    setDifficultyFilter("");
  };

  // Check if all filtered songs are saved offline
  const allFilteredSongsOffline = useMemo(() => {
    if (filteredSongs.length === 0) return false;
    return filteredSongs.every((song) => offlineSongs.has(song.slug));
  }, [filteredSongs, offlineSongs]);

  // One song. `saveSong` marks the slug in flight itself, so the row's ring
  // needs nothing from here — only the guard against starting a second
  // operation on a table that is already running one.
  const toggleOffline = async (song: ParsedSong) => {
    if (isBulkRunning || savingSlugs.has(song.slug)) return;
    try {
      if (offlineSongs.has(song.slug)) {
        await removeSong(song.slug);
      } else {
        const storedSong = parsedSongToStoredSong(song);
        await saveSong(storedSong);
      }
    } catch (error) {
      console.error("Error toggling offline status:", error);
    }
  };

  /**
   * Every visible song, six at a time.
   *
   * **Not serial, and not `saveMultipleSongs`.** Serial was what this did, and
   * with no filters that is 276 songs and 552 fetches queued end to end — the
   * rows do tick over visibly, but the whole run takes long enough that the
   * reader is watching a progress bar, not saving a songbook. The bulk helper
   * next door is the opposite trade: one transaction, one pool, and no way to
   * know which song is in flight, so no row could say anything. A pool over
   * `saveSong` keeps both — up to six rings at once, each row resolving on its
   * own — at the price of 276 small IndexedDB writes, which is nothing.
   *
   * `OFFLINE_SAVE_CONCURRENCY` is the same six `cacheManySongPages` uses, and
   * it is imported rather than retyped so there is one answer to the question.
   *
   * **A song that fails does not stop the rest.** It used to: one `throw` left
   * the loop in the `catch` with the remaining songs untouched and nothing on
   * screen saying so. The failure is per song now, and the report is the row —
   * `saveSong` rolls its own IndexedDB write back when the pages will not
   * cache, so a song that did not save is a box that did not tick and a count
   * that does not include it.
   */
  const toggleAllOffline = async () => {
    if (isBulkRunning) return;

    const removing = allFilteredSongsOffline;
    const targets = filteredSongs.filter((song) =>
      removing ? offlineSongs.has(song.slug) : !offlineSongs.has(song.slug),
    );
    if (targets.length === 0) return;

    setBulkAction(removing ? "remove" : "save");
    const queue = [...targets];
    const worker = async () => {
      for (let song = queue.shift(); song; song = queue.shift()) {
        try {
          if (removing) {
            await removeSong(song.slug);
          } else {
            await saveSong(parsedSongToStoredSong(song));
          }
        } catch (error) {
          console.error(`Error toggling ${song.slug}:`, error);
        }
      }
    };

    try {
      await Promise.all(
        Array.from(
          { length: Math.min(OFFLINE_SAVE_CONCURRENCY, queue.length) },
          worker,
        ),
      );
    } finally {
      setBulkAction(null);
    }
  };

  const savedCount = offlineSongs.size;

  return (
    <div>
      <div className="uv-list-head">
        <div>
          <p className="uv-eyebrow">El cancionero</p>
          <h1 className="uv-list-count">
            {filteredSongs.length}{" "}
            {filteredSongs.length === 1 ? "canción" : "canciones"}
          </h1>
        </div>
        {/* The app has always tracked which songs are on the phone and never
            said how many.

            The count changes and the instruction does not. The instruction
            used to be the other half of the empty state, so the one line
            connecting the checkbox to saving disappeared the moment it had
            worked once — shown to readers who had never used the feature and
            taken away from everyone who had (BUG-012). Below 640px the table
            drops its header row, so on a phone this is the only place the
            column is explained at all. */}
        <p className="uv-list-saved">
          <IconCheck size={16} />
          <span>
            {savedCount === 0
              ? "Ninguna guardada todavía."
              : `${savedCount} ${savedCount === 1 ? "guardada" : "guardadas"} en el teléfono.`}{" "}
            Marca las que vayas a tocar.
          </span>
        </p>
      </div>

      <div className="uv-filters">
        <div className="uv-search uv-filters__search">
          <IconSearch />
          <input
            className="uv-input"
            type="search"
            placeholder="Buscar por título o artista..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Buscar por título o artista"
          />
        </div>

        {/* The sizing class goes on the combobox's wrapper, not on its input:
            the listbox is positioned against the wrapper, so the wrapper is
            what has to be the width of the control. */}
        <FilterCombobox
          className="uv-filters__select"
          label="Filtrar por tono"
          emptyLabel="Todos los tonos"
          options={uniqueKeys}
          value={keyFilter}
          onChange={setKeyFilter}
        />

        <FilterCombobox
          className="uv-filters__select"
          label="Filtrar por artista"
          emptyLabel="Todos los artistas"
          options={uniqueArtists}
          value={artistFilter}
          onChange={setArtistFilter}
        />

        {/* Three chips rather than a third combobox — vault DECISIONS.md 17
            says its own answer was for 181 options and does not generalise.
            They are rendered from DIFFICULTY_BANDS, so a band cannot exist in
            the scale and be missing from the control.

            There is no fourth "todas" chip: the cleared state is none of the
            three pressed, and a chip meaning "no filter" would look pressed in
            exactly the state it produces. Pressing the pressed one clears it,
            which is also what makes the group reachable by keyboard without a
            roving tabindex — these are three ordinary toggle buttons, not a
            radio group pretending to be one. */}
        <fieldset className="uv-segmented">
          {/* A real `<fieldset>` and `<legend>` rather than `role="group"` with
              an `aria-label` — biome asks for the element over the role, and it
              is right: this is a group of form controls, which is the one thing
              a fieldset is for.

              The legend is visually hidden because the two comboboxes beside it
              carry no visible label either, and a lone "DIFICULTAD" over three
              chips would be the only labelled control in the row — and would
              make this the tallest item in a flex row that currently stretches
              everything to match. The chips say what they are. */}
          <legend className="uv-sr-only">Filtrar por dificultad</legend>
          {DIFFICULTY_BANDS.map((band) => (
            <button
              key={band.id}
              type="button"
              className="uv-segmented__option"
              aria-pressed={difficultyFilter === band.id}
              onClick={() =>
                setDifficultyFilter((current) =>
                  current === band.id ? "" : band.id,
                )
              }
            >
              {band.label}
            </button>
          ))}
        </fieldset>

        {hasFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="uv-btn uv-btn--ghost"
          >
            <span>Limpiar filtros</span>
          </button>
        )}
      </div>

      <div className="uv-table-frame">
        <table className="uv-table">
          <thead>
            <tr>
              {/* Titled like the other five columns. The word is the half a
                  sighted reader was missing: the input has carried an
                  aria-label since M7, so the column read fine to a screen
                  reader and to nobody else (BUG-012).

                  The name flips with the state, because a checked box is
                  about to un-save and announcing "Guardar" on it says the
                  opposite of what it does. */}
              <th className="uv-table__check">
                <span className="uv-table__check-head">
                  <span>Guardar</span>
                  <label className="uv-check">
                    {/* `aria-disabled` rather than `disabled` while the run is
                        going: disabling an input blurs it, so a keyboard user
                        who ticks this box is thrown back to the top of the
                        document for as long as 276 songs take. The handler
                        refuses the second press instead. `disabled` is still
                        right for the empty table — there is nothing there to
                        keep focus on. */}
                    <input
                      type="checkbox"
                      checked={allFilteredSongsOffline}
                      onChange={toggleAllOffline}
                      disabled={filteredSongs.length === 0}
                      aria-disabled={isBulkRunning || undefined}
                      // Same as the rows: while its ring is up, this cell says
                      // one thing (BUG-013). Here the two flags happen to
                      // agree, and they are still written separately, because
                      // one is "you cannot press this" and the other is "this
                      // is working" — and in the rows below they diverge.
                      data-busy={isBulkRunning || undefined}
                      aria-label={
                        allFilteredSongsOffline
                          ? "Quitar del teléfono todas las visibles"
                          : "Guardar en el teléfono todas las visibles"
                      }
                    />
                    {isBulkRunning && (
                      <SavingRing
                        label={
                          bulkAction === "remove"
                            ? "Quitando del teléfono las canciones visibles"
                            : "Guardando en el teléfono las canciones visibles"
                        }
                      />
                    )}
                  </label>
                </span>
              </th>
              <th>Título</th>
              <th>Artista</th>
              <th className="uv-table__year">Año</th>
              <th className="uv-table__key">Tono</th>
              <th className="uv-table__time">Compás</th>
              {/* "Acordes" and not "Dificultad": the column prints the number,
                  and the number is the criterion. The band is what tints it and
                  what the filter beside the table selects on. */}
              <th className="uv-table__difficulty">Acordes</th>
            </tr>
          </thead>
          <tbody>
            {filteredSongs.length === 0 ? (
              // Marked, because below 640px every other row is laid out as a
              // card grid and this one is a single full-width cell.
              <tr className="uv-table__empty-row">
                <td colSpan={7}>
                  <div className="uv-cell uv-table__empty">
                    No encontramos esa canción. Prueba con el nombre del
                    artista.
                  </div>
                </td>
              </tr>
            ) : (
              filteredSongs.map((song) => {
                const isSaved = offlineSongs.has(song.slug);
                const isSaving = savingSlugs.has(song.slug);
                const chordCount = song.metadata.chords.length;
                const difficulty = songDifficulty(chordCount);

                return (
                  <tr key={song.slug} aria-busy={isSaving || undefined}>
                    <td className="uv-table__check">
                      <div className="uv-cell uv-table__check-cell">
                        <label className="uv-check">
                          <input
                            type="checkbox"
                            checked={isSaved}
                            onChange={() => toggleOffline(song)}
                            // Without this a tap on the box navigates: the cells
                            // around it are all links to the song.
                            onClick={(e) => e.stopPropagation()}
                            // Every box in the table, not only the one in
                            // flight: while "guardar todas" is running, a row
                            // that has not come up yet is not a control the
                            // reader can usefully press.
                            aria-disabled={
                              isBulkRunning || isSaving || undefined
                            }
                            // Per song, and deliberately not the line above:
                            // this is what hides the box, and during a bulk
                            // run every box is aria-disabled while only six
                            // are actually working (BUG-013).
                            data-busy={isSaving || undefined}
                            aria-label={
                              isSaved
                                ? `Quitar ${song.metadata.title} del teléfono`
                                : `Guardar ${song.metadata.title} en el teléfono`
                            }
                          />
                          {isSaving && (
                            <SavingRing
                              label={
                                isSaved
                                  ? `Quitando ${song.metadata.title}`
                                  : `Guardando ${song.metadata.title}`
                              }
                            />
                          )}
                        </label>
                      </div>
                    </td>
                    <SongCell slug={song.slug} className="uv-td-title">
                      {song.metadata.title}
                    </SongCell>
                    <SongCell slug={song.slug} className="uv-td-muted">
                      {song.metadata.artist}
                    </SongCell>
                    {/* Mono from here on: a year, a tono, a compás and a chord
                      count are the musical facts about a song, and nothing else
                      in the interface is allowed to be monospaced. */}
                    <SongCell
                      slug={song.slug}
                      className="uv-td-mono uv-td-muted"
                    >
                      {song.metadata.year || "—"}
                    </SongCell>
                    <SongCell slug={song.slug} className="uv-td-mono">
                      {song.metadata.key}
                    </SongCell>
                    <SongCell
                      slug={song.slug}
                      className="uv-td-mono uv-td-muted"
                    >
                      {song.metadata.timeSignature}
                    </SongCell>
                    {/* The tint is the glance and the number is the message.
                        The band word reaches a screen reader through the
                        title's own sentence below, so nothing here depends on
                        telling three colours apart.

                        Not wired to `useTransposition`, and that is deliberate:
                        transposing maps distinct chords to distinct chords, so
                        this count is the same in all twelve keys M11 offers. A
                        chip that moved with the key would be reporting a change
                        that did not happen. */}
                    <SongCell slug={song.slug} className="uv-td-difficulty">
                      <span
                        className="uv-difficulty"
                        data-difficulty={difficulty}
                      >
                        {chordCount} {chordCount === 1 ? "acorde" : "acordes"}
                      </span>
                      <span className="uv-sr-only">
                        {` — dificultad ${difficultyLabel(difficulty)}`}
                      </span>
                    </SongCell>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
