"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { FilterCombobox, foldForSearch } from "@/components/FilterCombobox";
import { IconCheck, IconDownload, IconSearch } from "@/components/icons";
import {
  parsedSongToStoredSong,
  useOfflineSongs,
} from "@/contexts/OfflineSongsContext";
import { useSongFilters } from "@/contexts/SongFiltersContext";
import {
  DIFFICULTY_BANDS,
  difficultyLabel,
  songDifficulty,
} from "@/lib/difficulty";
import { OFFLINE_SAVE_CONCURRENCY } from "@/lib/offlinePages";
import type { ParsedSong } from "@/types/song";

interface SongListProps {
  songs: ParsedSong[];
}

/**
 * Above this many songs, "guardar todas" asks first.
 *
 * The header checkbox sits directly above 276 rows of identical checkboxes and
 * is the one that means *all of them* — a mis-tap starts a run of hundreds of
 * fetches that cannot be called back. Below the threshold the run is over in a
 * moment and the undo is pressing the box again, so a dialog there is only a
 * second tap on every deliberate press.
 *
 * Written as its own number and deliberately not `OFFLINE_SAVE_CONCURRENCY`,
 * which happens to be the same six: that one is how fast the pool runs, this
 * one is how many songs are worth asking about, and tuning either should not
 * move the other.
 */
const BULK_CONFIRM_MIN = 6;

/**
 * The ring that says this row is working.
 *
 * It is drawn *over* the icon rather than beside it, and the button is not
 * removed while it spins: a spinner in a 78px column that pushes the control
 * aside makes 276 rows jitter as they tick over one by one, and swapping the
 * button out drops keyboard focus to the top of the document mid-save.
 */
function SavingRing({ label }: { label: string }) {
  return (
    <>
      <span className="uv-spinner" aria-hidden="true" />
      <span className="uv-sr-only">{label}</span>
    </>
  );
}

/**
 * One cell of the table.
 *
 * Every cell except the save button is a link to the song, but none of them is
 * what makes the row tappable: the row is taller than its text at every width,
 * and the space that is left over belongs to the `<tr>`. What paves it is the
 * título's stretched pseudo-element in `globals.css` (BUG-021), so the five
 * links below it are read by a pointer as one target and by a keyboard as
 * five — hence `uv-td-title` is the one that carries it.
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
  // Not `useState`, and that is BUG-017: this component is inside `/list`, so
  // opening a song unmounts it and four initialisers run again on the way back.
  // The values live in a provider in `(app)/layout.tsx`, which navigating from
  // the list to a song does not unmount — read that file before moving them.
  const {
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
    hasFilters,
    clearFilters,
  } = useSongFilters();

  const { offlineSongs, savingSlugs, saveSong, removeSong } = useOfflineSongs();
  // Which way the header checkbox is running, not just that it is: the two
  // read differently to a screen reader, and "guardando" over a run that is
  // removing songs is the same lie the checkbox used to tell (BUG-012).
  const [bulkAction, setBulkAction] = useState<"save" | "remove" | null>(null);
  const isBulkRunning = bulkAction !== null;

  // What the dialog is asking about, held between the press and the answer.
  // The page behind a modal is inert, so the filters cannot move underneath it
  // and this list cannot go stale while the question is on screen.
  const confirmRef = useRef<HTMLDialogElement>(null);
  const [pendingSaves, setPendingSaves] = useState<ParsedSong[]>([]);

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

      // The fifth filter asks the set the checkbox column already writes to —
      // no second copy of what "saved" means, and it narrows the same list the
      // other four narrow rather than opening a second one (vault
      // DECISIONS.md 34).
      const matchesSaved = !savedOnly || offlineSongs.has(song.slug);

      return (
        matchesSearch &&
        matchesKey &&
        matchesArtist &&
        matchesDifficulty &&
        matchesSaved
      );
    });
  }, [
    songs,
    searchTerm,
    keyFilter,
    artistFilter,
    difficultyFilter,
    savedOnly,
    // Not decorative: with the filter on, un-ticking a row has to drop it out
    // of the table, and `offlineSongs` is a new Set on every save and remove.
    offlineSongs,
  ]);

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
  const runBulk = async (removing: boolean, targets: ParsedSong[]) => {
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

  /**
   * The header checkbox, and the only control in the app that asks first.
   *
   * The question is asked about `targets` and not about `filteredSongs`: with
   * 200 visible and 198 already on the phone the box is offering to save two,
   * and "¿guardar 200 canciones?" over a two-song run is the wrong number and
   * the wrong warning.
   *
   * **Only the saving direction is guarded.** Un-saving is the same mis-tap and
   * deliberately still goes straight through — it is instant, it costs the
   * reader nothing but a re-download, and `emptyMessage` below already exists
   * to catch the one confusing thing it does.
   */
  const toggleAllOffline = () => {
    if (isBulkRunning) return;

    const removing = allFilteredSongsOffline;
    const targets = filteredSongs.filter((song) =>
      removing ? offlineSongs.has(song.slug) : !offlineSongs.has(song.slug),
    );
    if (targets.length === 0) return;

    if (!removing && targets.length >= BULK_CONFIRM_MIN && confirmRef.current) {
      setPendingSaves(targets);
      // Reset by `showModal()` in current browsers, and set here anyway: the
      // whole decision below hangs off this string, and a stale "save" from the
      // last time round would start the run nobody confirmed.
      confirmRef.current.returnValue = "";
      confirmRef.current.showModal();
      return;
    }

    void runBulk(removing, targets);
  };

  const savedCount = offlineSongs.size;

  /**
   * Why the table is empty, and it is three different reasons.
   *
   * *"Prueba con el nombre del artista"* is advice for a search that missed. It
   * is the wrong thing to say to somebody who has simply never ticked a box —
   * and it is the wrong thing to say to somebody who just pressed the header
   * checkbox with the filter on, which un-saves every visible song and empties
   * the table under them. That press is the control doing exactly what its
   * label says, so it is not guarded; this is where it lands softly.
   */
  const emptyMessage =
    savedOnly && savedCount === 0
      ? "Todavía no has guardado ninguna. Marca la casilla de cualquier canción y la tendrás aquí, y en el teléfono sin señal."
      : savedOnly
        ? "Ninguna de tus canciones guardadas coincide con los otros filtros."
        : "No encontramos esa canción. Prueba con el nombre del artista.";

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
            column is explained at all.

            **The count above it is not this number and is left alone.** With
            *Guardadas* on and nothing else, the two do read the same figure
            twice — but they part company the moment a second filter joins
            (3 canciones over 12 guardadas), and one of them is a live count of
            the table while the other is a live count of the phone. Suppressing
            either in the one state where they agree would hide a number
            somebody is watching change. */}
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

        {/* One chip, borrowing the dificultad chips' own class rather than
            growing a control of its own: this is a two-state filter over a set
            of two, which is what those three already are one of.

            It is not a fourth combobox — DECISIONS.md 17's answer was for 181
            artists and does not generalise down to two — and it is not a
            checkbox, because the row it stands in already says how a filter
            looks here, and every other checkbox on this screen means *save
            this song*.

            The saved count in `.uv-list-head` stays prose and is deliberately
            not this control. It is the only place the checkbox column is
            explained below 640px (BUG-012), and a line that both explains a
            column and toggles a filter gets pressed by people trying to read
            it. */}
        <button
          type="button"
          className="uv-segmented__option"
          aria-pressed={savedOnly}
          onClick={() => setSavedOnly((current) => !current)}
        >
          Guardadas
        </button>

        {/* *Guardar todas* lives here and not over the table, and that is the
            whole reason it is a button (2026-08-10).

            It used to be a checkbox in the table's header row, which below
            640px is `display: none` — so the one control that saves a filtered
            selection did not exist on a phone, which is the device the whole
            app is for. Anything that lives in `thead` has that problem. This
            row does not: it is the row that *decides* what "las visibles"
            means, it already holds one action button, and it is drawn at every
            width.

            One control at every width rather than a phone copy of the header
            one — `DECISIONS.md` 34's argument about a second table applies to a
            second control, and the header checkbox is gone rather than hidden.
            What the move buys on the way past is a visible name and a count:
            the thing BUG-012 wanted for this action and could not fit in a
            78px column.

            Before *Limpiar filtros* rather than after, so that pressing this
            button is not a moving target — *Limpiar* comes and goes with
            `hasFilters` and would shove it sideways.

            Hidden on an empty table instead of disabled: there is nothing to
            act on and nothing there to keep focus on, which is what the
            checkbox's own `disabled` used to say. */}
        {filteredSongs.length > 0 && (
          <button
            type="button"
            onClick={toggleAllOffline}
            aria-disabled={isBulkRunning || undefined}
            className={`uv-btn ${
              allFilteredSongsOffline ? "uv-btn--saved" : "uv-btn--secondary"
            }`}
          >
            {allFilteredSongsOffline ? (
              <IconCheck size={17} />
            ) : (
              <IconDownload size={17} />
            )}
            <span>
              {isBulkRunning
                ? bulkAction === "remove"
                  ? "Quitando..."
                  : "Guardando..."
                : `${allFilteredSongsOffline ? "Quitar" : "Guardar"} ${
                    filteredSongs.length === 1
                      ? "la canción"
                      : `las ${filteredSongs.length}`
                  }`}
            </span>
          </button>
        )}

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
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
              {/* Empty, and it is the second thing this cell has lost.

                  BUG-012 titled it GUARDAR; that came off because the word only
                  fitted stacked above the box in 78px and a two-line heading in
                  a row of one-line headings sized the whole header row. Then
                  the box itself went to the filter row above, because a control
                  in `thead` does not exist below 640px — see the comment there.

                  What is left is a header for a column of controls, which is a
                  column that names itself: every button in it carries the
                  song's own title in its `aria-label`, and the sentence a
                  sighted reader gets is `.uv-list-saved` above the table. */}
              <th className="uv-table__check" />
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
                  <div className="uv-cell uv-table__empty">{emptyMessage}</div>
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
                        {/* The song sheet's own two icons, not a tick-box
                            (2026-08-10). `SaveOfflineButton` has drawn this
                            exact fact with a download arrow for the action and
                            a tick for the state since M7 — turquesa is the one
                            action colour, verde means saved — and the list was
                            the only place in the app that said the same thing
                            about the same song in a different vocabulary.

                            A button and not an `<input>`: what this does is run
                            two fetches and a write, which is an action, and a
                            checkbox promises a form. The state it *reports* is
                            the tick, and `aria-label` says what the press does
                            rather than leaving it to a checked attribute. */}
                        <button
                          type="button"
                          className="uv-save-toggle"
                          onClick={(e) => {
                            // Without this a tap on the control navigates: the
                            // cells around it are all links to the song.
                            e.stopPropagation();
                            toggleOffline(song);
                          }}
                          // Every button in the table, not only the one in
                          // flight: while "guardar todas" is running, a row
                          // that has not come up yet is not a control the
                          // reader can usefully press. `aria-disabled` and not
                          // `disabled`, because disabling the focused one
                          // throws a keyboard reader to the top of the
                          // document; the handler refuses the press instead.
                          aria-disabled={isBulkRunning || isSaving || undefined}
                          data-saved={isSaved || undefined}
                          // Per song, and deliberately not the line above:
                          // this is what hides the icon, and during a bulk
                          // run every button is aria-disabled while only six
                          // are actually working (BUG-013).
                          data-busy={isSaving || undefined}
                          aria-label={
                            isSaved
                              ? `Quitar ${song.metadata.title} del teléfono`
                              : `Guardar ${song.metadata.title} en el teléfono`
                          }
                        >
                          {isSaved ? (
                            <IconCheck size={19} />
                          ) : (
                            <IconDownload size={19} />
                          )}
                          {isSaving && (
                            <SavingRing
                              label={
                                isSaved
                                  ? `Quitando ${song.metadata.title}`
                                  : `Guardando ${song.metadata.title}`
                              }
                            />
                          )}
                        </button>
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

      {/* A native `<dialog>`, so the focus trap, Esc, the inert page behind it
          and the top layer are the platform's problem and not this file's —
          which is the whole reason there is no modal component here.

          `method="dialog"` means neither button needs a handler: submitting
          closes with that button's value and `onClose` is the single place the
          answer is read. Esc and a backdrop dismissal close with an empty
          value, so they cancel through the same line rather than needing one
          of their own. */}
      <dialog
        ref={confirmRef}
        className="uv-confirm"
        aria-labelledby="uv-confirm-title"
        onClose={() => {
          if (confirmRef.current?.returnValue === "guardar") {
            void runBulk(false, pendingSaves);
          }
        }}
      >
        <form method="dialog">
          <h2 id="uv-confirm-title" className="uv-confirm__title">
            ¿Guardar {pendingSaves.length} canciones en el teléfono?
          </h2>
          <p className="uv-confirm__text">
            Se descargan una por una y puede tardar un rato. Después las tienes
            sin señal, y puedes quitarlas cuando quieras.
          </p>
          <div className="uv-confirm__actions">
            {/* Cancelar first, and not only for the reading order: `showModal`
                focuses the first focusable child, so the mis-tap this dialog
                exists for lands on the way out. */}
            <button type="submit" value="" className="uv-btn uv-btn--ghost">
              Cancelar
            </button>
            <button
              type="submit"
              value="guardar"
              className="uv-btn uv-btn--primary"
            >
              Guardar todas
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
