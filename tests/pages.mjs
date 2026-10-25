// Helper for the site tests: where the site lives, which pages it must have,
// and how to read the links out of each page. Node built-ins only.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const SITE_ORIGIN = "https://sg9ae1-prog.github.io/motivo";
export const PAGES = [
  "index.html",
  "privacy/index.html",
  "terms/index.html",
  "support/index.html",
  "delete-account/index.html",
];
/** Pages served from any URL depth (GitHub Pages' 404), so they link as /motivo/... instead of relatively. */
export const SUBPATH_ABSOLUTE_PAGES = new Set(["404.html"]);
export const SITE_BASE = "/motivo/";
export const LEGAL_PATHS = ["privacy/", "terms/", "support/", "delete-account/"];
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const SKIP_DIRS = new Set([".git", "node_modules"]);

/** Every HTML file in the repository, as paths relative to the root. */
export function listHtmlFiles(dir = ROOT) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) found.push(...listHtmlFiles(join(dir, entry.name)));
    } else if (entry.name.endsWith(".html")) {
      found.push(relative(ROOT, join(dir, entry.name)).split(sep).join("/"));
    }
  }
  return found.sort();
}

export function readPage(page) {
  return readFileSync(join(ROOT, page), "utf8");
}

/** Every href and src value in a page's HTML. */
export function extractLinks(html) {
  return [...html.matchAll(/\b(?:href|src)\s*=\s*"([^"]*)"/gi)].map((m) => m[1]);
}

export function isExternal(link) {
  if (link === SITE_ORIGIN || link.startsWith(SITE_ORIGIN + "/")) return false; // a self-link is internal
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(link);
}

/**
 * Resolve an internal link found on `page` to a file path relative to the
 * root. A trailing slash (or a folder) means that folder's index.html.
 * Returns null for links that are not files (pure fragments).
 */
export function resolveInternal(page, link) {
  if (link === SITE_ORIGIN || link.startsWith(SITE_ORIGIN + "/")) {
    // Absolute self-link: the path after the origin is relative to the repo root.
    link = link.slice(SITE_ORIGIN.length).replace(/^\//, "") || "./";
    page = "index.html";
  }
  const clean = link.split("#")[0].split("?")[0];
  if (clean === "") return null;
  const target = resolve(ROOT, dirname(page), clean);
  const rel = relative(ROOT, target).split(sep).join("/");
  if (clean.endsWith("/") || (existsSync(target) && statSync(target).isDirectory())) {
    return (rel ? rel + "/" : "") + "index.html";
  }
  return rel;
}

export function fileExists(rel) {
  return existsSync(join(ROOT, rel)) && statSync(join(ROOT, rel)).isFile();
}

/** The page's <footer> block, with relative depth ("../") removed so copies compare equal. */
export function footerOf(html) {
  const m = html.match(/<footer[\s\S]*?<\/footer>/i);
  return m ? m[0].replace(/(?:\.\.\/)+/g, "").replace(/\s+/g, " ").trim() : null;
}

/** Problems with the internal links of one page's HTML (relative or SITE_ORIGIN self-links). */
export function findBrokenLinks(page, html) {
  const broken = [];
  for (const link of extractLinks(html)) {
    if (isExternal(link) || link.startsWith("#")) continue;
    if (SUBPATH_ABSOLUTE_PAGES.has(page) && link.startsWith(SITE_BASE)) {
      const rest = link.slice(SITE_BASE.length).split("#")[0].split("?")[0];
      const target = rest === "" || rest.endsWith("/") ? rest + "index.html" : rest;
      if (!fileExists(target)) broken.push(`${page}: ${link} -> ${target}`);
      continue;
    }
    if (link.startsWith("/")) { broken.push(`${page}: root-absolute link ${link}`); continue; }
    const target = resolveInternal(page, link);
    if (target && !fileExists(target)) broken.push(`${page}: ${link} -> ${target}`);
  }
  return broken;
}

/** The scripts a page starts once it has shown, in order, from its after-load loader: [{ src, module }]. */
export function pageScripts(html) {
  const loader = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('addEventListener("load"')) ?? "";
  return [...loader.matchAll(/\["([^"]+)", "(module|classic)"\]/g)].map((m) => ({ src: m[1], module: m[2] === "module" }));
}
