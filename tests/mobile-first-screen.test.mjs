import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

// The first screen on a phone: Motivo's hello must show whole, and the page must arrive quickly on a phone network.
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const css = read("../assets/landing.css");
const js = read("../assets/landing.js");
const html = read("../index.html");

test("on a phone, Motivo stays big: little room is reserved above his head, and the hello may tuck over his hair", () => {
  const pad = Number(css.match(/^\.hero-char \{[^}]*padding-top: (\d+)px/m)?.[1]);
  assert.ok(pad <= 90, `phone padding above the character is ${pad}px; more shrinks him`);
  const place = js.slice(js.indexOf("function placeSay"), js.indexOf("/* ---------------- blinking"));
  assert.match(place, /tuck = \.1 \* S/, "the message may overlap the top tenth of his drawing, never his face");
});

test("on a phone, the first screen's copy is the name and 'Your friendly guide.' only; the longer line shows on desktop", () => {
  assert.match(css, /^\.meet-copy \.meet-what \{[^}]*display: none/m, "hidden on phones, where every line shrinks Motivo");
  assert.match(css, /^\s+\.meet-copy \.meet-what \{[^}]*display: block/m, "shown on desktop");
  assert.match(html, /class="[^"]*\bmeet-what\b/, "still in the page for search engines, and for screen readers on desktop");
});

test("the message never rises behind the corner button while that button is showing", () => {
  const place = js.slice(js.indexOf("function placeSay"), js.indexOf("/* ---------------- blinking"));
  assert.match(place, /\.early/, "the message's upper limit is taken from the corner button");
  assert.match(place, /away/, "once the button steps aside, the message may use the top of the screen");
});

test("the logo is a small file, not a full-size picture shrunk on screen", () => {
  const kb = statSync(new URL("../assets/img/logo-mark.png", import.meta.url)).size / 1024;
  assert.ok(kb < 16, `logo is ${kb.toFixed(0)} KB`);
});

test("the fonts start downloading as the page opens", () => {
  for (const f of ["baloo-2-latin-800-normal.woff2", "nunito-latin-700-normal.woff2", "nunito-latin-900-normal.woff2"])
    assert.match(html, new RegExp(`<link rel="preload"[^>]*${f.replace(/[.]/g, "\\.")}`), `${f} is preloaded`);
  assert.ok(html.indexOf('rel="preload"') < html.indexOf('rel="stylesheet"'), "preloads come before the stylesheets");
});
