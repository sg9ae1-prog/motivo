import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readPage } from "./pages.mjs";

// The page's order as a funnel: meet Motivo, then the problem it solves, then the proof; the email is asked for once, at the end.
const html = readPage("index.html");
const css = readFileSync(new URL("../assets/landing.css", import.meta.url), "utf8");
const section = (id) => html.match(new RegExp(`<section[^>]*id="${id}"[\\s\\S]*?</section>`, "i"))[0];
const words = (s) => s.replace(/<[^>]+>/g, " ").replace(/&\w+;/g, " ").trim().split(/\s+/).filter(Boolean).length;
const items = (block) => [...block.matchAll(/<li>[\s\S]*?<\/li>/g)].map((m) => m[0]);
const label = (li) => li.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

test("the page opens on Meet Motivo, then the hero's problem and promise", () => {
  const first = html.match(/<main>\s*(?:<!--[\s\S]*?-->\s*)*<section[^>]*id="([^"]+)"/)[1];
  assert.equal(first, "meet");
  assert.ok(html.indexOf('id="meet"') < html.indexOf('id="hero"'));
});

test("no email is asked for before the page has said what Motivo is", () => {
  assert.doesNotMatch(section("meet"), /<form|type="email"/);
  assert.doesNotMatch(section("hero"), /<form|type="email"/);
  const forms = html.match(/<form[\s\S]*?<\/form>/g) ?? [];
  assert.equal(forms.length, 1, "one sign-up form");
  assert.ok(section("get").includes(forms[0]), "and it is on the last screen");
});

test("someone already sold can jump to the sign-up from a corner button", () => {
  const early = html.match(/<a class="early"[^>]*>[\s\S]*?<\/a>/);
  assert.ok(early, "an early-access button");
  assert.match(early[0], /href="#get"/);
  assert.match(early[0], />\s*Get early access\s*</);
  assert.ok(html.indexOf(early[0]) < html.indexOf("<main>"), "outside the screens, so it stays in the corner");
  assert.match(css, /\.early\s*\{[^}]*position:\s*fixed/);
});

test("Free shows what really stays free, and what Pro adds, as icons with a word or two", () => {
  const free = section("free");
  const freeList = free.match(/<div class="plan free">[\s\S]*?<\/ul>/)[0];
  const proList = free.match(/<div class="plan pro">[\s\S]*?<\/ul>/)[0];
  assert.deepEqual(items(freeList).map(label), ["Habits", "Tasks", "Streaks", "Morning hello", "A little chat"]);
  assert.deepEqual(items(proList).map(label), ["Unlimited chat", "Voice", "Memory", "Personalities", "Task guides"]);
  for (const li of [...items(freeList), ...items(proList)]) assert.match(li, /<svg[\s\S]*<\/svg>/, `${label(li)} has an icon`);
  assert.match(free, /Try Pro free first\./);
  assert.ok(words(free) <= 34, `Free says ${words(free)} words`);
});

test("Privacy is a locked phone and four short tiles", () => {
  const priv = section("privacy");
  const tiles = items(priv.match(/<ul class="tiles"[\s\S]*?<\/ul>/)[0]);
  assert.deepEqual(tiles.map(label), ["Lives on your phone", "Chats not stored by us", "AI partners promise no training", "Delete any time"]);
  for (const li of tiles) assert.match(li, /<svg[\s\S]*<\/svg>/);
  assert.match(priv, /class="lockphone"/);
  assert.ok(words(priv) <= 26, `Privacy says ${words(priv)} words`);
});

test("the corner button steps aside on the sign-up screen, where the form itself is", () => {
  const js = readFileSync(new URL("../assets/page-content.js", import.meta.url), "utf8");
  assert.match(js, /IntersectionObserver[\s\S]{0,300}\.early[\s\S]{0,200}classList\.toggle\("away"/);
  assert.match(css, /\.early\.away\s*\{[^}]*opacity:\s*0[^}]*pointer-events:\s*none/);
});
