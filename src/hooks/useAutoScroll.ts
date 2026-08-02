"use client";

import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/**
 * The song sheet scrolling itself, with no UI attached.
 *
 * **The sub-pixel accumulator is the whole engine.** A readable pace is well
 * under one pixel per animation frame — at the slowest setting this app offers
 * it is about a fifteenth of one — so any implementation that computes a
 * per-frame delta and hands it to `scrollBy` rounds a fraction to zero on every
 * frame and the page never moves at all. The bug that produces looks like *slow
 * speeds are broken* and is really *every speed below about 60px/s is broken*,
 * which is every speed anybody would use. So the target position is a float this
 * loop owns across frames, and each frame writes it **absolutely**. Nothing is
 * ever asked of the browser in increments.
 *
 * The step comes from the timestamp `requestAnimationFrame` hands us and never
 * from an assumed 60Hz: a 120Hz phone would otherwise scroll at twice the pace,
 * and a busy one at whatever it could manage.
 *
 * **The pace is lines per minute** (see `src/lib/scrollSpeed.ts`), resolved here
 * against the sheet's own line box, so one number means the same thing on a
 * phone, on a laptop, after a pinch-zoom and after an OS text-size bump.
 *
 * **`prefers-reduced-motion: reduce` is deliberately not honoured here, and that
 * is a decision rather than an oversight.** The design system zeroes every
 * duration under that query, and it is right to: those are transitions the
 * reader did not ask for. This is not decoration — it is the feature itself,
 * started by a person pressing a button and stopped by them pressing it again,
 * and a reduced-motion reader who presses play wants the page to scroll. What
 * the preference would forbid is animating *around* the reader; there is nothing
 * here to disable that would leave the feature working. This comment is the
 * record, because an issue gets closed and the repo is what stops it being
 * re-litigated.
 */

interface UseAutoScrollOptions {
  /** Lines of lyric per minute. */
  linesPerMinute: number;
  /**
   * The sheet. Its own line box is the unit the pace is measured in, so the
   * ref points at the rendered lyrics rather than at a number in a constant.
   */
  sheetRef: RefObject<HTMLElement | null>;
}

interface AutoScroll {
  isRunning: boolean;
  toggle: () => void;
}

/**
 * The fallback line advance, in px, for the moment before the sheet is
 * measurable. Close to what the sheet actually computes to at its default size;
 * it is never the number in play once there are lyrics on the screen.
 */
const FALLBACK_LINE_PX = 43;

/**
 * How far the page may move without us before it counts as the reader taking
 * over, in px.
 *
 * It is not zero because the loop's own writes come back rounded on some
 * browsers and because scroll anchoring nudges the page when something above
 * the viewport changes size. It is small because a reader reaching out to
 * correct the sheet moves it by a great deal more than four pixels.
 */
const MANUAL_SCROLL_TOLERANCE = 4;

/**
 * One line of lyric, in px, as the sheet is actually rendering it right now.
 *
 * A rendered line is its line box *plus* the room reserved above it for the
 * chord (`--lyric-chord-gap`, written as `padding-top` on `.uv-sheet-line`), so
 * both are read: the chord's room is part of what the reader sees as one line,
 * and leaving it out would make every setting scroll at half the pace its
 * number claims.
 */
function resolveLinePx(sheet: HTMLElement | null): number {
  if (!sheet) return FALLBACK_LINE_PX;

  const line = sheet.querySelector<HTMLElement>(".uv-sheet-line");
  if (!line) return FALLBACK_LINE_PX;

  const style = window.getComputedStyle(line);
  const lineHeight = Number.parseFloat(style.lineHeight);
  const chordGap = Number.parseFloat(style.paddingTop);

  const total =
    (Number.isFinite(lineHeight) ? lineHeight : 0) +
    (Number.isFinite(chordGap) ? chordGap : 0);

  return total > 0 ? total : FALLBACK_LINE_PX;
}

/** The furthest down the document can be scrolled. */
function maxScrollTop(): number {
  return Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight,
  );
}

export function useAutoScroll({
  linesPerMinute,
  sheetRef,
}: UseAutoScrollOptions): AutoScroll {
  const [isRunning, setIsRunning] = useState(false);

  const toggle = useCallback(() => setIsRunning((running) => !running), []);

  // Read inside the loop rather than closed over, so changing the speed does
  // not tear down and re-seed a scroll that is already under way.
  const paceRef = useRef(linesPerMinute);
  paceRef.current = linesPerMinute;

  useEffect(() => {
    if (!isRunning) return;

    let frame = 0;
    /** The position this loop owns, carried as a float between frames. */
    let target = 0;
    /** What the page actually read back after our last write. */
    let written = 0;
    let linePx = FALLBACK_LINE_PX;
    let previousTimestamp = 0;
    /** The viewport size we last measured against. */
    let viewportHeight = 0;
    /**
     * Adopt the page's current position instead of correcting it back to ours.
     *
     * Set on the first frame, on a resize, and on coming back to a visible tab.
     * All three are moments when the page has legitimately moved underneath the
     * loop — iOS collapsing its address bar mid-scroll is the common one, and
     * treating that 50px as the reader taking over would stop the scroll every
     * time it happened.
     */
    let resync = true;

    const step = (now: number) => {
      if (resync) {
        resync = false;
        target = window.scrollY;
        written = window.scrollY;
        linePx = resolveLinePx(sheetRef.current);
        viewportHeight = window.innerHeight;
        previousTimestamp = now;
        frame = requestAnimationFrame(step);
        return;
      }

      // The reader reached out and moved the page. They are correcting the
      // thing, not fighting it, so it hands back rather than pulling against
      // them. The comparison is against what this loop last wrote — a listener
      // for scroll events alone would fire on our own writes and pause on the
      // first frame.
      if (Math.abs(window.scrollY - written) > MANUAL_SCROLL_TOLERANCE) {
        setIsRunning(false);
        return;
      }

      // A pace of nothing is not a very slow scroll, it is a stopped one. The
      // slider cannot reach it — its slowest step is six lines a minute — so
      // this is the guard against a future one that can, rather than a state
      // the app has today.
      const pace = paceRef.current;
      if (pace <= 0) {
        setIsRunning(false);
        return;
      }

      const elapsed = (now - previousTimestamp) / 1000;
      previousTimestamp = now;

      target += ((pace * linePx) / 60) * elapsed;

      // The song has ended. Stopping here is what keeps the control from
      // reading *playing* over a page that cannot move.
      const limit = maxScrollTop();
      if (target >= limit) {
        window.scrollTo(0, limit);
        setIsRunning(false);
        return;
      }

      window.scrollTo(0, target);
      written = window.scrollY;
      frame = requestAnimationFrame(step);
    };

    /**
     * A resize is a re-measurement, not a scroll. The address bar collapsing,
     * the phone turning, the OS text size changing and the reader pinch-zooming
     * all land here; every one of them wants the pace re-resolved and the
     * position adopted, and none of them wants the scroll stopped.
     */
    const handleResize = () => {
      if (window.innerHeight !== viewportHeight) resync = true;
      linePx = resolveLinePx(sheetRef.current);
    };

    /**
     * Hidden means nobody is reading. The frame is cancelled — the browser
     * would stop calling us anyway — and, on coming back, the time spent away
     * is *discarded* rather than applied: without the resync the first frame
     * back carries a delta of however long the reader was gone and the page
     * leaps that far down the song. Coming back to where you left it is the
     * whole point.
     */
    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
        return;
      }
      resync = true;
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isRunning, sheetRef]);

  return { isRunning, toggle };
}
