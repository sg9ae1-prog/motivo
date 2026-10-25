import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  PAGES, LEGAL_PATHS, ROOT, SKIP_DIRS, SITE_ORIGIN, listHtmlFiles, readPage,
  extractLinks, findBrokenLinks, fileExists, footerOf, SUBPATH_ABSOLUTE_PAGES,
} from "./pages.mjs";

// Pages that exist today; checks other than "every page exists" cover these.
const present = () => listHtmlFiles();

test("every page exists", () => {
  const missing = PAGES.filter((p) => !fileExists(p));
  assert.deepEqual(missing, [], `missing pages: ${missing.join(", ")}`);
});

test("every internal link resolves", () => {
  const broken = present().flatMap((page) => findBrokenLinks(page, readPage(page)));
  assert.deepEqual(broken, []);
});

test("a self-link to a missing page is reported, and one to a real page is not", () => {
  const bad = `<link rel="canonical" href="${SITE_ORIGIN}/no-such-page/">`;
  assert.equal(findBrokenLinks("index.html", bad).length, 1);
  assert.deepEqual(findBrokenLinks("index.html", `<a href="${SITE_ORIGIN}/assets/site.css">x</a>`), []);
  assert.deepEqual(findBrokenLinks("index.html", `<a href="${SITE_ORIGIN}/">x</a>`), []);
});

function* allFiles(dir = ROOT) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* allFiles(p);
    else if (/\.(html|css|js|mjs|md|json|txt)$/.test(e.name) && statSync(p).size < 2_000_000) yield p;
  }
}

test("no link to the retired site", () => {
  const offenders = [];
  for (const f of allFiles()) {
    if (f.endsWith("site.test.mjs")) continue; // this file names the thing it forbids
    if (readFileSync(f, "utf8").includes("lovable.app")) offenders.push(f);
  }
  assert.deepEqual(offenders, []);
});

test("no placeholder text", () => {
  const offenders = present().filter((p) => /lorem|TODO|TBD|href="#"(?!\w)/i.test(readPage(p)));
  assert.deepEqual(offenders, []);
});

test("every page carries the footer", () => {
  const footers = new Set();
  for (const page of PAGES) {
    assert.ok(fileExists(page), `${page}: missing`);
    const footer = footerOf(readPage(page));
    assert.ok(footer, `${page}: no <footer>`);
    const hrefs = extractLinks(footer);
    for (const legal of LEGAL_PATHS) {
      assert.ok(hrefs.some((h) => h.replace(/^(\.\.\/)+/, "") === legal), `${page}: footer lacks ${legal}`);
    }
    assert.ok(hrefs.includes("mailto:contact@magpy.co"), `${page}: footer lacks contact mailto`);
    assert.ok(footer.includes("© Magpy"), `${page}: footer lacks © Magpy`);
    footers.add(footer);
  }
  assert.equal(footers.size, 1, "footers differ between pages");
});

test("every page has a title, a description and a viewport tag", () => {
  for (const page of PAGES) {
    assert.ok(fileExists(page), `${page}: missing`);
    const html = readPage(page);
    assert.match(html, /<title>[^<]+<\/title>/i, `${page}: title`);
    assert.match(html, /<meta\s+name="description"\s+content="[^"]+"/i, `${page}: description`);
    assert.match(html, /<meta\s+name="viewport"\s+content="[^"]*width=device-width/i, `${page}: viewport`);
  }
});

test("every page carries the same relative favicon link as the landing page", () => {
  const iconOf = (html) => html.match(/<link\s+rel="icon"\s+href="([^"]+)"/i)?.[1];
  const landing = iconOf(readPage("index.html"));
  assert.equal(landing, "assets/img/favicon-32.png");
  for (const page of [...PAGES, "404.html"]) {
    const icon = iconOf(readPage(page));
    assert.ok(icon, `${page}: no <link rel="icon">`);
    if (SUBPATH_ABSOLUTE_PAGES.has(page)) assert.equal(icon, "/motivo/" + landing, `${page}: icon`);
    else assert.equal(icon, "../".repeat(page.split("/").length - 1) + landing, `${page}: icon`);
  }
});

test("no page loads a script or stylesheet from another host", () => {
  const offenders = [];
  for (const page of present()) {
    const html = readPage(page);
    const tags = html.match(/<script\b[^>]*>|<link\b[^>]*rel="(?:stylesheet|preload|modulepreload)"[^>]*>/gi) ?? [];
    for (const tag of tags) {
      const url = tag.match(/\b(?:src|href)="([^"]+)"/i)?.[1];
      if (url && /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url) && !url.startsWith(SITE_ORIGIN)) offenders.push(`${page}: ${url}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("the vendored libraries exist locally", () => {
  for (const f of ["gsap.min.js", "ScrollTrigger.min.js", "confetti.browser.min.js"]) {
    assert.ok(fileExists("assets/vendor/" + f), f);
  }
});

test("sharing: landing page has Open Graph and Twitter card tags, legal pages have title and description", () => {
  const meta = (html, key) => html.match(new RegExp(`<meta\\s+(?:property|name)="${key}"\\s+content="([^"]*)"`, "i"))?.[1];
  const landing = readPage("index.html");
  assert.equal(meta(landing, "og:title"), landing.match(/<title>([^<]+)<\/title>/)[1]);
  assert.equal(meta(landing, "og:description"), meta(landing, "description"));
  assert.equal(meta(landing, "og:url"), SITE_ORIGIN + "/");
  assert.equal(meta(landing, "og:image"), SITE_ORIGIN + "/assets/img/og.png");
  assert.equal(meta(landing, "og:type"), "website");
  assert.equal(meta(landing, "twitter:card"), "summary_large_image");
  assert.equal(meta(landing, "twitter:image"), SITE_ORIGIN + "/assets/img/og.png");
  assert.ok(fileExists("assets/img/og.png"));
  const png = readFileSync(join(ROOT, "assets/img/og.png"));
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  for (const page of PAGES.slice(1)) {
    const html = readPage(page);
    assert.ok(meta(html, "og:title"), `${page}: og:title`);
    assert.ok(meta(html, "og:description"), `${page}: og:description`);
  }
});

test("404 page: brand stylesheet, footer, a way home, absolute-on-subpath links", () => {
  const html = readPage("404.html");
  assert.match(html, /href="\/motivo\/assets\/site\.css"/);
  assert.ok(footerOf(html), "footer");
  assert.ok(extractLinks(html).includes("/motivo/"), "link home");
  assert.deepEqual(findBrokenLinks("404.html", html), []);
  assert.equal(findBrokenLinks("index.html", '<a href="/motivo/">x</a>').length, 1, "other pages may not use root-absolute links");
});
