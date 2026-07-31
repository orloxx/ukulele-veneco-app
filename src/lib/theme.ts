/** Where the reader's choice of theme is remembered. */
export const THEME_STORAGE_KEY = "uv-theme";

/**
 * The script that applies the stored theme before the first paint.
 *
 * It has to be blocking and it has to run before any of the page is painted, or
 * every night-time load flashes cream before settling to the dark ground — which
 * is worse than not having a dark theme at all. That is why it is a string of
 * source inlined into `<body>`'s first child rather than an effect: React has not
 * run yet at this point, and neither has anything else.
 *
 * `<html>` therefore carries `suppressHydrationWarning`, because this script has
 * already changed an attribute React thinks it owns by the time it hydrates.
 *
 * Nothing stored means the system setting, which is the only default that can be
 * right without asking.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})()`;
