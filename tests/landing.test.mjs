import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readPage } from "./pages.mjs";

// The landing page's voice and pre-launch rules from the spec, made checkable.
const html = readPage("index.html");
const text = html
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&rsquo;/g, "’").replace(/&hellip;/g, "…")
  .replace(/\s+/g, " ");

const section = (id) => html.match(new RegExp(`<section[^>]*id="${id}"[\\s\\S]*?</section>`, "i"))[0];
const css = readFileSync(new URL("../assets/landing.css", import.meta.url), "utf8");
const js = readFileSync(new URL("../assets/character.js", import.meta.url), "utf8");

test("hero copy is verbatim", () => {
  assert.ok(text.includes("The friend who never gives up on you."));
  assert.match(html, /<h2>[\s\S]*<em class="a">gives up on you\.<\/em>[\s\S]*<\/h2>/, "the accent stays on the end of the headline");
  assert.ok(text.includes("Helps you reach your goals, in the way that works best for you."));
  assert.doesNotMatch(text, /Whatever you dream of/, "the old sub-line is gone, share tags included");
});

test("the hero opens with a thought, not a spoken line", () => {
  const anchor = section("hero").match(/<div class="anchor"[^>]*data-anchor[^>]*>/)[0];
  assert.match(anchor, /data-think="Where do I start\?"/);
  assert.doesNotMatch(anchor, /data-say=/);
  assert.doesNotMatch(html, /so where do I even start/);
  assert.match(css, /#say\.chat\b/, "the bubble has a chat-message variant");
});

test("one Motivo logo on the first screen, directly above Meet Motivo", () => {
  assert.doesNotMatch(html, /<header\b/, "no top-bar brand to double the first screen's logo");
  assert.equal((html.match(/<div class="brand\b/g) ?? []).length, 1);
  const copy = section("meet").match(/<div class="meet-copy"[\s\S]*?<\/h1>/)[0];
  assert.match(copy, /<div class="meet-copy">\s*<div class="brand[^"]*"><img src="assets\/img\/logo-mark\.png"[^>]*alt=""[^>]*><\/div>\s*<h1 id="meet-title"[^>]*>/,
    "the logo alone: the name is already in Meet Motivo, right below it");
});

test("question marks live around the character, never loose in the hero", () => {
  const hero = section("hero");
  const qms = hero.match(/class="qm"/g) ?? [];
  assert.ok(qms.length >= 3);
  const around = hero.match(/<div class="anchor"[^>]*>([\s\S]*?)<\/div>/)[1];
  assert.equal((around.match(/class="qm"/g) ?? []).length, qms.length, "every question mark sits inside the character's spot");
});

test("every section and every beat is one snapped screen", () => {
  assert.match(css, /html\s*\{[^}]*scroll-snap-type:\s*y mandatory/);
  assert.match(css, /\.snap\s*\{[^}]*height:\s*100svh[^}]*scroll-snap-align:\s*start/);
  const ids = ["hero", "meet", "how", "can-do", "yours", "chatbot", "free", "privacy", "get"];
  for (const id of ids) {
    const s = section(id);
    const open = s.match(/<section[^>]*>/)[0];
    assert.ok(/class="[^"]*\bsnap\b/.test(open) || /class="[^"]*\bsnap\b/.test(s.slice(open.length)), `${id} has a snapped screen`);
  }
  for (const beat of html.match(/<div class="beat\b[^"]*"/g)) assert.match(beat, /\bsnap\b/, beat);
  assert.equal((section("how").match(/class="beat\b/g) ?? []).length, 4);
  assert.equal((section("can-do").match(/class="[^"]*\bsnap\b/g) ?? []).length, 4, "one phone per screen");
  assert.equal((section("can-do").match(/<figure class="cap"/g) ?? []).length, 4);
  assert.equal((section("yours").match(/class="[^"]*\bsnap\b/g) ?? []).length, 2, "the look, then how it talks");
});

test("native snapping owns the scroll: no smooth-scroll library", () => {
  assert.doesNotMatch(html, /lenis/i);
  assert.doesNotMatch(js, /Lenis/);
});

test("the headline never leads with AI", () => {
  const h1 = html.match(/<h1[\s\S]*?<\/h1>/i)[0].replace(/<[^>]+>/g, " ").trim();
  assert.doesNotMatch(h1, /^AI\b/);
});

test("no banned words", () => {
  assert.doesNotMatch(text, /productivity|optimi[sz]e|unlock your potential/i);
});

test("at most two emoji on the whole page", () => {
  // Emoji shown as pictures; text symbols such as the footer's © are not emoji.
  const emoji = html.match(/\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F/gu) ?? [];
  assert.ok(emoji.length <= 2, `found ${emoji.length}: ${emoji.join(" ")}`);
});

test("before launch there are no store buttons, and every sign-up form is complete", () => {
  assert.doesNotMatch(html, /App Store|Google Play|play\.google\.com|apps\.apple\.com/);
  const forms = html.match(/<form[\s\S]*?<\/form>/gi) ?? [];
  assert.ok(forms.length >= 1, "the Get Motivo form");
  for (const f of forms) {
    assert.match(f, /type="email"/);
    assert.match(f, /name="website"/);
    assert.match(f, />\s*Be first\s*</);
    assert.ok(f.includes("We'll only write when Motivo launches."));
  }
});

test("the section order follows the spec", () => {
  const ids = ["meet", "hero", "how", "can-do", "yours", "chatbot", "free", "privacy", "get"];
  const at = ids.map((id) => html.indexOf(`id="${id}"`));
  assert.ok(at.every((i) => i > 0), `missing: ${ids.filter((_, k) => at[k] < 0)}`);
  assert.deepEqual([...at].sort((a, b) => a - b), at);
});

test("pricing shows no numbers, and privacy links to the policy", () => {
  const free = html.match(/<section[^>]*id="free"[\s\S]*?<\/section>/i)[0];
  assert.ok(free.includes("Prices are shown in the store."));
  assert.doesNotMatch(free.replace(/<[^>]+>/g, " "), /[$€£₪]|\d/);
  const privacy = html.match(/<section[^>]*id="privacy"[\s\S]*?<\/section>/i)[0];
  assert.match(privacy, /href="privacy\/"/);
});

test("the speech bubble is decoration: screen readers hear the forms, not the character", () => {
  const say = html.match(/<div id="say"[^>]*>/)[0];
  assert.match(say, /aria-hidden="true"/);
  assert.doesNotMatch(say, /aria-live|role=/);
});

test("the phone screens and notifications only show text the app really shows", () => {
  // An accessibility label is never visible text in the app.
  assert.doesNotMatch(section("can-do"), /Talk to Motivo live/);
  // "Not another chatbot" shows the activity reminder the app sends, with its real buttons.
  const motivo = section("chatbot").match(/<div class="vs mo">[\s\S]*?<p class="verdict">/)[0];
  assert.match(motivo, /A small step is all it takes/);
  assert.match(motivo, /You've got this\./);
  assert.match(motivo, />\s*Done\s*</);
  assert.match(motivo, />\s*Not today\s*</);
  assert.doesNotMatch(motivo, /didn't happen|What got in the way/);
});

test("landing styles never out-rank the shared ones, and focus rings keep each button's shape", () => {
  assert.doesNotMatch(css, /^\.landing p\s*\{/m, "use :where(.landing) p so class rules win");
  const site = readFileSync(new URL("../assets/site.css", import.meta.url), "utf8");
  const focus = site.match(/[^}]*:focus-visible[^{]*\{[^}]*\}/g) ?? [];
  assert.ok(focus.length > 0);
  for (const rule of focus) assert.doesNotMatch(rule, /border-radius/);
});

test("iOS tilt asks on a real tap (click), never on touchend, and listens again if the ask fails", () => {
  assert.doesNotMatch(js, /touchend/);
  assert.match(js, /requestPermission\(\)[\s\S]{0,200}\.catch\(arm\)/);
  assert.match(js, /catch \{ arm\(\); \}/);
});
