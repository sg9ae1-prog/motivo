import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nextScreenTop, stepFor } from "../assets/step-screens.js";
import { pageScripts } from "./pages.mjs";

// The hero's look and feel, and keyboard paging, as asked for after the first review of the page.
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const css = read("../assets/landing.css");
const js = read("../assets/character.js");
const html = read("../index.html");

test("the hero's question is a chat message from the reader, with Motivo typing back", () => {
  assert.match(css, /#say\.chat\s*\{[^}]*border-radius:\s*18px 18px 18px 4px/, "a message card, not a cloud");
  assert.doesNotMatch(css, /#say\.(thought|chat)::before\s*\{[^}]*radial-gradient/, "the cloud puffs are gone");
  assert.match(css, /#say\.chat\s+\.from\b/, "the card names its sender");
  assert.match(css, /#say\.chat\.you::after\s*\{[^}]*animation:/, "the typing dots move, under the reader's message only");
  assert.match(js, /YOU · NOW/);
  assert.match(js, /setPhase[\s\S]*?\{ from: "you" \}/);
});

test("Motivo's hello on the first screen is a chat message from Motivo, not a speech bubble", () => {
  assert.match(js, /MOTIVO · NOW/);
  assert.match(js, /speak\(anchorLine\(\$\("#meet"\)\), \{ from: "motivo" \}\)/);
  assert.match(css, /#say\.chat\.motivo \.from\s*\{[^}]*color:/, "Motivo's name stands out from the reader's");
  assert.match(css, /#say\.chat\.motivo::after\s*\{[^}]*display:\s*none/, "no typing dots and no speech-bubble tail");
});

test("the Motivo logo on the first screen is big: it is the app's mark", () => {
  assert.match(css, /\.meet-copy \.brand img\s*\{[^}]*width:\s*64px/);
  assert.match(css, /\.meet-copy \.brand img\s*\{[^}]*width:\s*84px/, "desktop logo");
});

test("the eyes rest: the gaze moves every 3 to 5 seconds and blinks come singly, 4 to 7 seconds apart", () => {
  assert.match(js, /wanderT = now \+ 3000 \+ Math\.random\(\) \* 2000/);
  assert.match(js, /setTimeout\(blink, 4000 \+ Math\.random\(\) \* 3000\)/);
  assert.doesNotMatch(js, /setTimeout\(blink, 220\)/, "no double blinks");
  assert.match(js, /else if \(wander\) \{\s*ease = \.045;/, "the idle gaze drifts slowly between points");
});

test("keyboard paging lives in its own module, loaded by the page", () => {
  assert.ok(pageScripts(html).some((s) => s.src === "assets/step-screens.js" && s.module));
});

test("each paging key moves one screen, in its direction; other keys and typing are left alone", () => {
  const key = (k, extra = {}) => ({ key: k, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, target: { tagName: "BODY" }, ...extra });
  assert.equal(stepFor(key("ArrowDown")), 1);
  assert.equal(stepFor(key("PageDown")), 1);
  assert.equal(stepFor(key(" ")), 1);
  assert.equal(stepFor(key("ArrowUp")), -1);
  assert.equal(stepFor(key("PageUp")), -1);
  assert.equal(stepFor(key(" ", { shiftKey: true })), -1);
  assert.equal(stepFor(key("a")), 0);
  assert.equal(stepFor(key("Home")), 0, "Home and End stay native");
  assert.equal(stepFor(key("ArrowDown", { metaKey: true })), 0, "Cmd+Down stays native");
  assert.equal(stepFor(key(" ", { target: { tagName: "INPUT" } })), 0, "a space typed in the email field");
  assert.equal(stepFor(key("ArrowDown", { target: { tagName: "BUTTON" } })), 1);
  assert.equal(stepFor(key(" ", { target: { tagName: "BUTTON" } })), 0, "Space presses a focused button");
});

test("the next screen is the nearest screen start past the current scroll, never a skip of two", () => {
  const tops = [0, 800, 1600, 2400];
  assert.equal(nextScreenTop(tops, 0, 800, 1), 800);
  assert.equal(nextScreenTop(tops, 800, 800, 1), 1600);
  assert.equal(nextScreenTop(tops, 801, 800, 1), 1600, "a pixel past a snap point still goes to the next one");
  assert.equal(nextScreenTop(tops, 800, 800, -1), 0);
  assert.equal(nextScreenTop(tops, 1200, 800, -1), 800, "between screens, back to the one above");
  assert.equal(nextScreenTop(tops, 2400, 800, 1), null, "nothing past the last screen: the browser takes it to the footer");
  assert.equal(nextScreenTop(tops, 0, 800, -1), null);
});

test("content between screens taller than the window is paged a window at a time", () => {
  assert.equal(nextScreenTop([0, 3000], 0, 800, 1), 800);
  assert.equal(nextScreenTop([0, 3000], 2800, 800, -1), 2000);
});
