import { test } from "node:test";
import assert from "node:assert/strict";
import { fileExists, readPage } from "./pages.mjs";

// Every phrase each legal page must carry: the spec's §6 items made checkable.
const REQUIRED = {
  "privacy/index.html": [
    "Magpy", "Israel", "contact@magpy.co", "Google", "Apple", "OpenRouter", "never stored",
    "never used to train", "YouTube", "RevenueCat", "Sentry", "Frankfurt", "early sign-up",
    "notifications", "13", "delete", "Last updated",
  ],
  "terms/index.html": [
    "Magpy", "Israel", "free trial", "renews automatically", "cancel", "App Store", "Google Play",
    "not medical", "13", "Last updated",
  ],
  "support/index.html": ["contact@magpy.co", "restore purchases", "cancel", "sign in"],
  "delete-account/index.html": ["Settings", "Delete account", "contact@magpy.co", "30 days"],
};

/** The visible text of a page: tags dropped, entities for spaces and arrows decoded, whitespace collapsed. */
function textOf(html) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&rarr;/g, "→").replace(/&rsquo;/g, "’")
    .replace(/\s+/g, " ");
}

for (const [page, phrases] of Object.entries(REQUIRED)) {
  test(`${page} covers what the spec requires`, () => {
    assert.ok(fileExists(page), `${page}: missing`);
    const text = textOf(readPage(page)).toLowerCase();
    const missing = phrases.filter((p) => !text.includes(p.toLowerCase()));
    assert.deepEqual(missing, [], `${page} lacks: ${missing.join(", ")}`);
  });
}

test("the legal pages show a date", () => {
  for (const page of Object.keys(REQUIRED)) {
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
  const text = textOf("<p>Run by <b>Magpy</b></p>").toLowerCase();
  assert.ok(text.includes("magpy"));
  assert.ok(!text.includes("israel"));
});
