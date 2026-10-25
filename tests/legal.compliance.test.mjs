import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { CONSENT_VERSION, POLICY_VERSION, submitSignup } from "../assets/signup.js";

// Legal and accessibility fixes from the pre-launch audit, made checkable.
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const text = (h) => h.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&rsquo;/g, "’").replace(/\s+/g, " ");
const html = read("index.html"), privacy = read("privacy/index.html"), terms = read("terms/index.html");
const section = (id) => html.match(new RegExp(`<section[^>]*id="${id}"[\\s\\S]*?</section>`))[0];

test("the sign-up form says what the email is for, links the policy and states the age, tied to the field", () => {
  const form = section("get").match(/<form[\s\S]*?<\/form>/)[0];
  const describedBy = form.match(/<input[^>]*type="email"[^>]*aria-describedby="([^"]+)"/)?.[1];
  assert.ok(describedBy, "the email field points at its consent line");
  const note = form.match(new RegExp(`<p[^>]*id="${describedBy}"[^>]*>([\\s\\S]*?)</p>`))?.[1];
  assert.ok(note, "the consent line has that id");
  assert.match(note, /when Motivo launches/);
  assert.match(note, /You must be 16 or older/);
  assert.match(note, /<a href="privacy\/">Privacy policy<\/a>/);
});

test("the sign-up sends the wording version and the policy version it showed", async () => {
  const calls = [];
  await submitSignup("a@b.co", "", async (_u, init) => { calls.push(JSON.parse(init.body)); return new Response('{"ok":true}'); });
  assert.deepEqual(calls[0], { email: "a@b.co", website: "", consent_version: CONSENT_VERSION, policy_version: POLICY_VERSION });
  assert.match(CONSENT_VERSION, /^[\w.-]{1,32}$/);
});

test("the privacy policy carries the version the form sends, and today's date", () => {
  assert.ok(privacy.includes(`Last updated: 25 October 2026`));
  assert.match(privacy, new RegExp(`Policy version:? ${POLICY_VERSION}`));
  assert.equal(POLICY_VERSION, "2026-10-25");
});

test("the privacy policy covers the early-access list: basis, withdrawal, retention, hosts, processors, transfers, controller", () => {
  const t = text(privacy).toLowerCase();
  for (const p of ["consent", "withdraw", "within 12 months", "1 month after the launch email", "whichever comes first",
    "github pages", "ip address", "frankfurt", "data privacy framework", "standard contractual clauses",
    "unsubscribe link", "controller of your data", "magpy", "contact@magpy.co", "israel", "under 16", "processors"]) {
    assert.ok(t.includes(p.toLowerCase()), `privacy lacks "${p}"`);
  }
  assert.doesNotMatch(t, /\{\{/, "no unfilled blanks");
  assert.doesNotMatch(t, /parent or guardian needs to agree/);
  assert.doesNotMatch(t, /aged 13/);
});

test("the terms and the privacy policy agree on age 16, and the terms drop the 13 and parental-consent lines", () => {
  for (const [n, h] of [["terms", terms], ["privacy", privacy]]) {
    const t = text(h);
    assert.match(t, /16/, n);
    assert.doesNotMatch(t, /13 or older|aged 13|under 13|parent or guardian needs to agree/, n);
  }
  assert.match(text(privacy), /do not knowingly collect[\s\S]{0,60}under 16/i);
  assert.match(text(terms), /You must be 16 or older/);
});

test("the landing page claims no more than the policy: no 'forever', no 'never kept on our server'", () => {
  const t = text(section("free") + section("privacy") + section("get"));
  assert.doesNotMatch(t, /forever|Never kept on our server|Not used to train AI/i);
  assert.match(t, /AI companion/);
  assert.doesNotMatch(text(terms), /forever/i);
});

test("the Be first button text reaches 4.5:1 on both ends of its amber gradient", () => {
  const css = read("assets/landing.css"), site = read("assets/site.css");
  const rule = css.match(/\.be-first\s*\{[^}]*\}/)[0];
  const vars = Object.fromEntries([...site.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
  const hex = (v) => (v.startsWith("var(") ? vars[v.slice(6, -1)] : v);
  const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((x) => (x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4)); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
  const color = hex(rule.match(/[^-]color:\s*([^;]+);/)[1].trim());
  for (const stop of ["amber", "amber-deep"]) assert.ok(ratio(color, vars[stop]) >= 4.5, `${color} on ${stop}: ${ratio(color, vars[stop]).toFixed(2)}`);
});

test("a keyboard-reachable pause control stops GSAP and CSS animation, and the page loads it", () => {
  assert.ok(existsSync(new URL("../assets/motion-toggle.js", import.meta.url)));
  const js = read("assets/motion-toggle.js"), css = read("assets/landing.css");
  assert.match(js, /gsap\.globalTimeline\.pause\(\)/);
  assert.match(js, /gsap\.globalTimeline\.resume\(\)/);
  assert.match(js, /createElement\("button"\)/);
  assert.match(js, /aria-pressed/);
  assert.match(js, /classList\.toggle\("motion-paused"/);
  assert.match(css, /\.motion-paused \*[^{]*\{[^}]*animation-play-state:\s*paused/);
  assert.match(html, /<script type="module" src="assets\/motion-toggle\.js"><\/script>/);
});
