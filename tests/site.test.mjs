import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  PAGES, LEGAL_PATHS, ROOT, listHtmlFiles, readPage, extractLinks,
  isExternal, resolveInternal, fileExists, footerOf,
} from "./pages.mjs";

// Pages that exist today; checks other than "every page exists" cover these.
const present = () => listHtmlFiles();

test("every page exists", () => {
  const missing = PAGES.filter((p) => !fileExists(p));
  assert.deepEqual(missing, [], `missing pages: ${missing.join(", ")}`);
});

test("every internal link resolves", () => {
  const broken = [];
  for (const page of present()) {
    for (const link of extractLinks(readPage(page))) {
      if (isExternal(link) || link.startsWith("#")) continue;
      if (link.startsWith("/")) { broken.push(`${page}: root-absolute link ${link}`); continue; }
      const target = resolveInternal(page, link);
      if (target && !fileExists(target)) broken.push(`${page}: ${link} -> ${target}`);
    }
  }
  assert.deepEqual(broken, []);
});

function* allFiles(dir = ROOT) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", "_prototype"].includes(e.name)) continue;
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
  const footers = new Map();
  for (const page of present()) {
    const html = readPage(page);
    const footer = footerOf(html);
    assert.ok(footer, `${page}: no <footer>`);
    const hrefs = extractLinks(footer);
    for (const legal of LEGAL_PATHS) {
      assert.ok(hrefs.some((h) => h.replace(/^(\.\.\/)+/, "") === legal), `${page}: footer lacks ${legal}`);
    }
    assert.ok(hrefs.includes("mailto:contact@magpy.co"), `${page}: footer lacks contact mailto`);
    assert.ok(footer.includes("© Magpy"), `${page}: footer lacks © Magpy`);
    footers.set(page, footer);
  }
  assert.equal(new Set(footers.values()).size <= 1, true, "footers differ between pages");
});

test("every page has a title, a description and a viewport tag", () => {
  for (const page of present()) {
    const html = readPage(page);
    assert.match(html, /<title>[^<]+<\/title>/i, `${page}: title`);
    assert.match(html, /<meta\s+name="description"\s+content="[^"]+"/i, `${page}: description`);
    assert.match(html, /<meta\s+name="viewport"\s+content="[^"]*width=device-width/i, `${page}: viewport`);
  }
});
