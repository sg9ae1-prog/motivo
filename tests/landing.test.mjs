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

test("hero copy is verbatim", () => {
  assert.ok(text.includes("The friend who never gives up on you."));
  assert.ok(text.includes("Whatever you dream of, one small win a day. And a party for every one."));
  assert.ok(html.includes("…so where do I even start?"), "speech bubble line");
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
  assert.ok(forms.length >= 2, "hero and Get Motivo forms");
  for (const f of forms) {
    assert.match(f, /type="email"/);
    assert.match(f, /name="website"/);
    assert.match(f, />\s*Be first\s*</);
    assert.ok(f.includes("We'll only write when Motivo launches."));
  }
});

test("the section order follows the spec", () => {
  const ids = ["hero", "how", "can-do", "yours", "chatbot", "free", "privacy", "get"];
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
  const section = (id) => html.match(new RegExp(`<section[^>]*id="${id}"[\\s\\S]*?</section>`, "i"))[0];
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
  const css = readFileSync(new URL("../assets/landing.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /^\.landing p\s*\{/m, "use :where(.landing) p so class rules win");
  const site = readFileSync(new URL("../assets/site.css", import.meta.url), "utf8");
  const focus = site.match(/[^}]*:focus-visible[^{]*\{[^}]*\}/g) ?? [];
  assert.ok(focus.length > 0);
  for (const rule of focus) assert.doesNotMatch(rule, /border-radius/);
});

test("iOS tilt asks on a real tap (click), never on touchend, and listens again if the ask fails", () => {
  const js = readFileSync(new URL("../assets/landing.js", import.meta.url), "utf8");
  assert.doesNotMatch(js, /touchend/);
  assert.match(js, /requestPermission\(\)[\s\S]{0,200}\.catch\(arm\)/);
  assert.match(js, /catch \{ arm\(\); \}/);
});

test("the hero form stays visible while it has focus", () => {
  const css = readFileSync(new URL("../assets/landing.css", import.meta.url), "utf8");
  assert.match(css, /\.hook:focus-within \.line\s*\{[^}]*opacity:\s*1 !important[^}]*visibility:\s*visible !important[^}]*transform:\s*none !important/);
  const js = readFileSync(new URL("../assets/landing.js", import.meta.url), "utf8");
  assert.match(js, /hook\.addEventListener\("focusin"/);
  assert.match(js, /hook\.addEventListener\("focusout"/);
});
