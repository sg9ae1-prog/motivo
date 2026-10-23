import { test } from "node:test";
import assert from "node:assert/strict";
import { LEGAL_PATHS, fileExists, readPage } from "./pages.mjs";

// Every phrase each legal page must carry: the spec's §6 items made checkable.
const PHRASES = {
  "privacy/": [
    "Magpy", "Israel", "contact@magpy.co", "Google", "Apple", "OpenRouter", "never stored",
    "never used to train", "YouTube", "RevenueCat", "Sentry", "Frankfurt", "early sign-up",
    "notifications", "13", "delete", "Last updated",
  ],
  "terms/": [
    "Magpy", "Israel", "free trial", "renews automatically", "cancel", "App Store", "Google Play",
    "not medical", "13", "Last updated",
  ],
  "support/": ["contact@magpy.co", "restore purchases", "cancel", "sign in"],
  "delete-account/": ["Settings", "Delete account", "contact@magpy.co", "30 days"],
};

/** The visible text of a page: tags dropped, entities for spaces and arrows decoded, whitespace collapsed. */
function textOf(html) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&rarr;/g, "→").replace(/&rsquo;/g, "’")
    .replace(/\s+/g, " ");
}

/** The phrases from the list that the text lacks, ignoring case. */
function missingPhrases(text, phrases) {
  const lower = text.toLowerCase();
  return phrases.filter((p) => !lower.includes(p.toLowerCase()));
}

const pageOf = (path) => `${path}index.html`;

test("every legal page has a phrase list", () => {
  assert.deepEqual(Object.keys(PHRASES).sort(), [...LEGAL_PATHS].sort());
});

for (const path of LEGAL_PATHS) {
  const page = pageOf(path);
  test(`${page} covers what the spec requires`, () => {
    assert.ok(fileExists(page), `${page}: missing`);
    const missing = missingPhrases(textOf(readPage(page)), PHRASES[path]);
    assert.deepEqual(missing, [], `${page} lacks: ${missing.join(", ")}`);
  });
}

test("the legal pages show a date", () => {
  for (const page of LEGAL_PATHS.map(pageOf)) {
    assert.ok(fileExists(page), `${page}: missing`);
    const text = textOf(readPage(page));
    const stamps = [...text.matchAll(/Last updated:?\s*(.{0,20})/gi)];
    assert.ok(stamps.length > 0, `${page}: no "Last updated"`);
    for (const [, after] of stamps) {
      assert.match(after, /^\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) \d{4}/,
        `${page}: "Last updated" not followed by a date like 23 October 2026`);
    }
  }
});

test("the phrase check catches a missing phrase", () => {
  const text = textOf("<p>Run by <b>MAGPY</b>, a company.</p>");
  assert.deepEqual(missingPhrases(text, ["Magpy", "Israel"]), ["Israel"]);
});
