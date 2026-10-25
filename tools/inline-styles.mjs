// Writes the landing page's styles into index.html, so its first screen shows without waiting on a style file.
// The style files stay the source: edit assets/site.css or assets/landing.css, then run:  node tools/inline-styles.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCES = ["site.css", "landing.css"];

/** The page's styles: the style files in order, with their file addresses rewritten for the page's folder. */
export function pageStyles() {
  const css = SOURCES.map((f) => readFileSync(new URL(`../assets/${f}`, import.meta.url), "utf8")).join("\n");
  return "\n" + css.replace(/url\((["']?)(?![a-z][a-z0-9+.-]*:|\/|#)/gi, "url($1assets/");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const page = new URL("../index.html", import.meta.url);
  const html = readFileSync(page, "utf8");
  const spot = /<style>[\s\S]*?<\/style>/;
  if (!spot.test(html)) throw new Error("index.html has no <style> block to fill");
  writeFileSync(page, html.replace(spot, () => `<style>${pageStyles()}</style>`));
  console.log("wrote the page's styles into index.html");
}
