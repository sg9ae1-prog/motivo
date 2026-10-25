// Whether the page moves: people who asked their device for less motion (or add ?rm) get a still page, through the "rm" class on <html>.
const root = document.documentElement;
if (matchMedia("(prefers-reduced-motion: reduce)").matches || new URLSearchParams(location.search).has("rm")) root.classList.add("rm");

export const REDUCED = root.classList.contains("rm");
