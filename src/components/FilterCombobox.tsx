"use client";

/**
 * A filter you type at, instead of a list you scroll.
 *
 * `/list` filters by tono and by artista. The artista list is 478 names, and a
 * native `<select>` of that length is a wheel with no way in: the platform
 * gives you a first-letter jump and nothing else, so finding *Simón Díaz*
 * means scrolling past four hundred people. This replaces both — the tono list
 * is short enough to have been fine, and is only here because two filters side
 * by side should not be two different controls.
 *
 * **It is hand-built, and that is the expensive half** (vault DECISIONS.md 17).
 * A native select carries the mobile picker, the keyboard, the screen-reader
 * semantics and focus management for free, and every one of them is rebuilt
 * below. The reason it is worth it is the 478, and the reason it is not a
 * dependency is that this app has no component library to add it to — the
 * icons are inlined paths for the same reason.
 *
 * Closed it is a `.uv-select`, unchanged: same trigger, same caret, same 44px.
 * Open it is a listbox filtered as you type, matched anywhere in the name and
 * through accents, so "simon diaz" finds "Simón Díaz" and "jose" finds "José".
 *
 * The pattern is ARIA 1.2's combobox with list autocomplete: the input keeps
 * focus and owns the keyboard throughout, and the active option is named by
 * `aria-activedescendant` rather than focused. Nothing in the list is ever
 * focused, which is what stops a 478-item list from being 478 tab stops.
 */

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * Fold case and accents for matching.
 *
 * The cancionero is full of names a phone keyboard makes tedious to type
 * exactly — Simón, Díaz, Chelique Sarabia, María Rodríguez — and a filter that
 * demands the tilde is a filter that finds nothing. Exported because the search
 * box beside these two matches the same songs and has to agree with them.
 */
export function foldForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

interface Choice {
  value: string;
  label: string;
}

interface FilterComboboxProps {
  /** The accessible name — the `aria-label` the `<select>` used to carry. */
  label: string;
  /** What "no filter" reads as, e.g. "Todos los artistas". */
  emptyLabel: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function FilterCombobox({
  label,
  emptyLabel,
  options,
  value,
  onChange,
  className,
}: FilterComboboxProps) {
  const id = useId();
  const listId = `${id}-list`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // "Todos los artistas" is an option rather than a separate clear button: it
  // is how the filter is undone from the keyboard without leaving the control,
  // and it filters like any other, so typing "todos" finds it.
  const choices = useMemo<Choice[]>(
    () => [
      { value: "", label: emptyLabel },
      ...options.map((option) => ({ value: option, label: option })),
    ],
    [options, emptyLabel],
  );

  const matches = useMemo(() => {
    const needle = foldForSearch(query.trim());
    if (needle === "") return choices;
    return choices.filter((choice) =>
      foldForSearch(choice.label).includes(needle),
    );
  }, [choices, query]);

  /** Shut, and forget whatever was typed. Nothing is committed by closing. */
  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const openList = useCallback(() => {
    setQuery("");
    setOpen(true);
    // Start on what is already chosen rather than at the top, so opening and
    // pressing Enter is a no-op instead of a reset.
    setActiveIndex(
      Math.max(
        0,
        choices.findIndex((c) => c.value === value),
      ),
    );
  }, [choices, value]);

  const commit = useCallback(
    (next: string) => {
      onChange(next);
      setOpen(false);
      setQuery("");
      inputRef.current?.focus();
    },
    [onChange],
  );

  // A pointer down anywhere else shuts it. `pointerdown` rather than `click`
  // so a tap that lands outside does not first select whatever it hit.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  // Back to the closed state with focus still here — after Escape, or after
  // choosing a name — leaves the text selected, so the next keystroke starts a
  // fresh search. Without it the input reads "Simón Díaz" and typing turns it
  // into "Simón Díazb", which matches nothing and looks like the control
  // ignoring you. It has to be an effect rather than a line in `close`: the
  // value only becomes the chosen name on the render after `open` flips, and a
  // selection made before that is over the wrong string.
  useEffect(() => {
    if (open) return;
    if (document.activeElement === inputRef.current) inputRef.current?.select();
  }, [open]);

  // Keep the active option in view. `block: "nearest"` scrolls the list and
  // not the page, which matters when the list is 478 long and the page is not.
  //
  // `activeIndex` reads as unused because the effect reaches the option through
  // the DOM rather than through the array — but it is the only thing that says
  // when to run, so it stays.
  // biome-ignore lint/correctness/useExhaustiveDependencies: activeIndex is the trigger, read through data-active rather than in the body
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (open) {
          setActiveIndex((index) => Math.min(index + 1, matches.length - 1));
        } else {
          openList();
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (open) {
          setActiveIndex((index) => Math.max(index - 1, 0));
        } else {
          openList();
        }
        break;
      case "Home":
        if (!open) break;
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        if (!open) break;
        event.preventDefault();
        setActiveIndex(Math.max(0, matches.length - 1));
        break;
      case "Enter": {
        if (!open) break;
        event.preventDefault();
        const choice = matches[activeIndex];
        if (choice) commit(choice.value);
        break;
      }
      case "Escape":
        if (!open) break;
        event.preventDefault();
        close();
        break;
      default:
        break;
    }
  };

  const active = open ? matches[activeIndex] : undefined;

  return (
    <div ref={containerRef} className={`uv-combobox ${className ?? ""}`}>
      {/* Closed, the input holds the chosen name — or "Todos los artistas" as
          real text, not a placeholder, so the control reads exactly as the
          select it replaced. Open, it holds what is being typed. Selecting the
          text on focus is what makes the first keystroke replace the label
          rather than append to it. */}
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        className="uv-select uv-combobox__input"
        value={open ? query : value || emptyLabel}
        // Open with nothing typed, the placeholder is the filter that is
        // actually applied — not "Todos los artistas", which would be a
        // control announcing the opposite of what the table below it is
        // showing. The list marks the same name as selected.
        placeholder={value || emptyLabel}
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={
          active ? `${id}-option-${activeIndex}` : undefined
        }
        autoComplete="off"
        spellCheck={false}
        onFocus={(event) => event.target.select()}
        onClick={() => {
          if (!open) openList();
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onBlur={(event) => {
          if (!containerRef.current?.contains(event.relatedTarget)) close();
        }}
        onKeyDown={handleKeyDown}
      />

      {open && (
        // A <ul role="listbox"> is what the combobox pattern asks for, and the
        // three suppressions below are all one disagreement with biome: its
        // a11y rules describe a widget you tab into, and this is a widget you
        // never tab into. Making the options focusable would put 478 tab stops
        // in the page and break `aria-activedescendant`, which is the whole
        // mechanism.
        <ul
          ref={listRef}
          id={listId}
          // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: the ARIA combobox pattern puts role="listbox" on the list
          role="listbox"
          aria-label={label}
          className="uv-combobox__list"
        >
          {matches.length === 0 ? (
            <li className="uv-combobox__empty">Ningún resultado</li>
          ) : (
            matches.map((choice, index) => (
              // biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard is on the input, which is where the pattern puts it
              // biome-ignore lint/a11y/useFocusableInteractive: options are named by aria-activedescendant and never focused
              <li
                key={choice.value || "__all__"}
                id={`${id}-option-${index}`}
                // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: an option in a listbox is exactly what an <li> is here
                role="option"
                aria-selected={choice.value === value}
                data-active={index === activeIndex}
                className="uv-combobox__option"
                // Mouse down would blur the input and shut the list before the
                // click landed. Selecting on click rather than on pointer down
                // is deliberate: on a phone, a pointer down over 478 options is
                // usually the start of a scroll, not a choice.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(choice.value)}
                onMouseMove={() => setActiveIndex(index)}
              >
                {choice.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
