import { test } from "node:test";
import assert from "node:assert/strict";
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
