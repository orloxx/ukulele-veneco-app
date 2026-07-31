"use client";

import { IconMoon, IconSun } from "@/components/icons";
import { THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * Light ⇄ dark, stored in localStorage, defaulting to the system setting.
 *
 * This component holds no React state, and that is the point. The server has no
 * idea which theme the browser stored, so anything rendered from a `theme`
 * variable is a hydration mismatch waiting to happen. Instead the blocking
 * script in `layout.tsx` puts `data-theme` on `<html>` before first paint, both
 * icons are always in the DOM, and CSS shows whichever one the attribute calls
 * for — so the markup React renders on the server and the markup it hydrates on
 * the client are byte-identical, and the right icon is already showing before
 * React runs at all.
 *
 * The label stays "Cambiar tema" rather than naming the destination theme, for
 * the same reason: it must not depend on state the server cannot know.
 */
export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode, or storage full. The theme still applies for this page.
    }
  };

  return (
    <button
      type="button"
      className="uv-iconbtn uv-theme-toggle"
      onClick={toggle}
      aria-label="Cambiar tema"
    >
      <span className="uv-theme-toggle__light">
        <IconMoon />
      </span>
      <span className="uv-theme-toggle__dark">
        <IconSun />
      </span>
    </button>
  );
}
