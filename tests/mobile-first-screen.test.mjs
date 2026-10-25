import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { pageScripts } from "./pages.mjs";

// The first screen on a phone: Motivo's hello must show whole, and the page must arrive quickly on a phone network.
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const css = read("../assets/landing.css");
const js = read("../assets/character.js");
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

// The first screen needs only the page itself: its styles are written into it, and nothing else downloads until it has shown.
test("the page's styles are written into it, matching the style files", async () => {
  const { pageStyles } = await import("../tools/inline-styles.mjs");
  assert.doesNotMatch(html, /<link rel="stylesheet"/, "no separate style file for the first screen to wait on");
  const style = html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
  assert.equal(style, pageStyles(), "stale: run node tools/inline-styles.mjs");
  assert.match(style, /url\("assets\/fonts\/baloo-2-latin-800-normal\.woff2"\)/, "file addresses are rewritten for the page's own folder");
});

test("nothing competes with the first screen: no early downloads, and no script tag downloads with the page", () => {
  assert.doesNotMatch(html, /<link[^>]*rel="(?:preload|modulepreload)"/);
  assert.doesNotMatch(html, /<script[^>]*\ssrc=/);
});

test("every screen is complete moments after the first one shows: the character and the page's content need no animation library", () => {
  const lane = (name) => pageScripts(html).filter((s) => s.lane === name).map((s) => s.src);
  assert.deepEqual(lane("first-screen"), [
    "assets/fit-screens.js", "assets/page-content.js", "assets/character.js", "assets/customiser.js",
    "assets/signup-init.js", "assets/step-screens.js", "assets/motion-toggle.js",
  ]);
  assert.deepEqual(lane("after-load"), ["assets/vendor/gsap.min.js", "assets/vendor/ScrollTrigger.min.js", "assets/vendor/confetti.browser.min.js", "assets/landing.js"]);
  assert.ok(pageScripts(html).every((s) => s.module === !s.src.includes("/vendor/")));
  for (const f of ["character.js", "customiser.js", "page-content.js", "motion.js"])
    assert.doesNotMatch(read(`../assets/${f}`), /\bgsap\b|\bScrollTrigger\b|\bconfetti\.create\b/, `${f} works before the libraries arrive`);
});

test("the first lane starts once the first screen is drawn, the second once the page has loaded, each in its listed order", () => {
  const loader = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('addEventListener("load"'));
  assert.match(loader, /requestAnimationFrame\(\(\) => setTimeout\(/, "after the first paint, not before it");
  assert.match(loader, /\.async = false/, "added scripts otherwise run in whatever order they finish downloading");
  assert.doesNotMatch(loader, /if[^;]*async = false/, "for modules as well as classic scripts");
});

test("the first lane asks for everything it imports at once, instead of finding each import one slow round trip after another", () => {
  const loader = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('addEventListener("load"'));
  const asked = [...(loader.match(/const imports = \[([^\]]*)\]/)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.match(loader, /rel = "modulepreload"/);
  const first = pageScripts(html).filter((s) => s.lane === "first-screen").map((s) => s.src);
  const needed = new Set(), walk = (src) => {
    for (const [, dep] of read(`../${src}`).matchAll(/^import[^"]*"\.\/([^"]+)"/gm)) {
      const path = `assets/${dep}`;
      if (!needed.has(path)) { needed.add(path); walk(path); }
    }
  };
  first.forEach(walk);
  assert.deepEqual(asked.sort(), [...needed].filter((s) => !first.includes(s)).sort());
});

test("entrances that arrive late never hide what the reader has already reached", () => {
  const late = read("../assets/landing.js");
  const body = late.slice(late.indexOf("function revealReached"));
  assert.match(body, /ScrollTrigger\.getAll\(\)/);
  assert.match(body, /getBoundingClientRect\(\)\.top < innerHeight/, "anything on screen or above it");
  assert.match(body, /progress\(1\)/, "is shown in its final state at once");
  assert.match(late, /revealReached\(\);\s*$/, "after every entrance is set up");
});

test("no script waits for the page's load event: they all arrive after it, so it would never come", () => {
  for (const f of readdirSync(new URL("../assets/", import.meta.url)).filter((f) => f.endsWith(".js") && f !== "bigheads.js"))
    assert.doesNotMatch(read(`../assets/${f}`), /addEventListener\("load"/, f);
});

test("fixed drawings are in the page itself, so a screen never grows or shifts when the scripts arrive", () => {
  const chords = html.match(/<div class="chords" id="chords"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/)?.[1] ?? "";
  assert.equal((chords.match(/<div class="chord">/g) ?? []).length, 3, "the three chord shapes");
  assert.equal((html.match(/<div class="wave" data-wave>((?:<i [^>]*><\/i>){22})<\/div>/)?.[1].match(/<i /g) ?? []).length, 22, "the voice bars");
  assert.doesNotMatch(read("../assets/page-content.js"), /#chords|data-wave/, "no script draws them");
});
