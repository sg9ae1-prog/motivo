import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { PAGES, SITE_ORIGIN, readPage } from "./pages.mjs";

// Search and AI-answer-engine readiness: titles, canonicals, structured data, sitemap, icons, FAQ.
const root = (p) => new URL("../" + p, import.meta.url);
const read = (p) => readFileSync(root(p), "utf8");
const css = read("assets/landing.css");
const home = read("index.html");
const ALL = [...PAGES, "faq/index.html"];
const canonicalOf = (page) => SITE_ORIGIN + "/" + page.replace(/index\.html$/, "").replace(/^$/, "");

function jsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
}

test("the home page says what Motivo is in its title and description", () => {
  assert.match(home, /<title>Motivo · [^<]*goal[^<]*<\/title>/);
  const d = home.match(/<meta name="description" content="([^"]+)"/)[1];
  assert.match(d, /^Motivo is a mobile app/);
  assert.match(d, /iPhone and Android/);
  assert.ok(d.length <= 200, `description is ${d.length} chars`);
  for (const k of ["og:description", "twitter:description"])
    assert.ok(home.includes(`content="${d}"`) && new RegExp(`(property|name)="${k}" content="${d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(home), `${k} matches the description`);
  const t = home.match(/<title>([^<]+)<\/title>/)[1];
  assert.match(home, new RegExp(`og:title" content="${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  assert.match(home, /og:image:alt/);
  assert.match(home, /twitter:image:alt/);
});

test("every indexable page has its own canonical link", () => {
  for (const page of ALL) {
    const c = readPage(page).match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    assert.equal(c, canonicalOf(page), page);
  }
  assert.match(readPage("404.html"), /noindex/);
  assert.doesNotMatch(readPage("404.html"), /rel="canonical"/);
});

test("every page links the square icons and the web manifest", () => {
  for (const page of [...ALL, "404.html"]) {
    const h = readPage(page);
    assert.match(h, /<link rel="icon" href="[^"]*favicon-32\.png" sizes="32x32" type="image\/png">/, page);
    assert.match(h, /<link rel="icon" href="[^"]*icon-192\.png" sizes="192x192" type="image\/png">/, page);
    assert.match(h, /<link rel="apple-touch-icon" href="[^"]*apple-touch-icon\.png">/, page);
    assert.match(h, /<link rel="manifest" href="[^"]*manifest\.webmanifest">/, page);
  }
});

test("the icons are square and the manifest names them", () => {
  const dims = (f) => { const b = readFileSync(root("assets/img/" + f)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  for (const [f, n] of [["favicon-32.png", 32], ["apple-touch-icon.png", 180], ["icon-192.png", 192], ["icon-512.png", 512]])
    assert.deepEqual(dims(f), [n, n], f);
  const m = JSON.parse(read("manifest.webmanifest"));
  assert.equal(m.name, "Motivo");
  assert.ok(m.icons.some((i) => i.sizes === "512x512") && m.icons.some((i) => i.sizes === "192x192"));
  for (const i of m.icons) assert.ok(existsSync(root(i.src)), i.src);
});

test("structured data parses: Organization, WebSite and a pre-launch MobileApplication", () => {
  const blocks = jsonLd(home).flatMap((b) => (b["@graph"] ? b["@graph"] : [b]));
  const by = (t) => blocks.find((b) => b["@type"] === t);
  assert.equal(by("Organization").name, "Motivo");
  assert.equal(by("Organization").url, SITE_ORIGIN + "/");
  assert.equal(by("WebSite").name, "Motivo");
  const app = by("MobileApplication");
  assert.equal(app.name, "Motivo");
  assert.match(app.operatingSystem, /iOS/);
  assert.match(app.operatingSystem, /Android/);
  assert.match(app.description, /not available yet|coming soon/i);
  for (const banned of ["aggregateRating", "review", "downloadUrl", "installUrl", "datePublished"]) assert.ok(!(banned in app), banned);
  assert.ok(!/Magpy/.test(JSON.stringify(by("Organization"))) || by("Organization").name === "Motivo");
});

test("sitemap lists every indexable page and not the 404", () => {
  const xml = read("sitemap.xml");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs.sort(), ALL.map(canonicalOf).sort());
  assert.doesNotMatch(xml, /404/);
});

test("llms.txt describes the site in the llmstxt.org shape", () => {
  const t = read("llms.txt");
  assert.match(t, /^# Motivo\n/);
  assert.match(t, /\n> .*mobile app/);
  for (const p of ["faq/", "privacy/", "terms/", "support/"]) assert.ok(t.includes(SITE_ORIGIN + "/" + p), p);
});

test("the staged host-root robots.txt welcomes search, answer and training bots and points at the sitemap", () => {
  const p = "/private/tmp/claude-501/-Users-guy-work-workspaces-motivo-your-friendly-guide/b552ef35-267d-4d02-9e7f-e100a8a8503f/scratchpad/root-robots/robots.txt";
  const r = readFileSync(p, "utf8");
  for (const bot of ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot", "GPTBot", "ClaudeBot", "Google-Extended", "CCBot"]) assert.match(r, new RegExp(`User-agent: ${bot}\\b`), bot);
  assert.doesNotMatch(r, /^Disallow:\s*\/\s*$/m, "nothing is blocked");
  assert.match(r, /^Sitemap: https:\/\/sg9ae1-prog\.github\.io\/motivo\/sitemap\.xml$/m);
});

test("the first screen has the plain sentence, one h1 first, and the other headings keep their look", () => {
  const meet = home.match(/<section id="meet"[\s\S]*?<\/section>/)[0];
  assert.match(meet, /<h1 id="meet-title" class="line">Meet <em class="t">Motivo\.<\/em><\/h1>/);
  assert.match(meet, /<p class="line">Your friendly guide\.<\/p>\s*<p class="line meet-what">A mobile app with an AI companion that helps you reach any goal/);
  assert.doesNotMatch(meet.split("Your friendly guide.")[1], /guide/i, "no new use of the word guide");
  assert.equal((home.match(/<h1[\s>]/g) || []).length, 1);
  assert.ok(home.indexOf("<h1") < home.indexOf("<h2"), "the h1 comes before any h2");
  assert.match(home, /<h2>\s*<span class="line">The friend who never/);
  assert.match(css, /\.meet-copy h1\s*\{[^}]*font-size/);
  assert.match(css, /\.hook h2\s*\{[^}]*font-size/);
  assert.doesNotMatch(css, /\.meet-copy h2|\.hook h1/);
  assert.match(css, /\.meet-copy \.meet-what\s*\{[^}]*font-size/);
  assert.match(css, /\.landing h1, \.landing h2/);
});

test("the FAQ page answers the common questions in visible text that the JSON-LD repeats", () => {
  const h = readPage("faq/index.html");
  assert.match(h, /<link rel="stylesheet" href="\.\.\/assets\/site\.css">/);
  assert.equal((h.match(/<h1[\s>]/g) || []).length, 1);
  const qs = [...h.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1]);
  assert.ok(qs.length >= 6 && qs.length <= 8, `${qs.length} questions`);
  const ld = jsonLd(h).find((b) => b["@type"] === "FAQPage");
  assert.equal(ld.mainEntity.length, qs.length);
  const strip = (s) => s.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const text = strip(h);
  for (const q of ld.mainEntity) {
    assert.ok(text.includes(q.name.replace(/&/g, "&")) || strip(h).includes(q.name), q.name);
    assert.ok(text.includes(q.acceptedAnswer.text), "answer visible: " + q.name);
  }
  for (const topic of [/What is Motivo/, /Who is/, /free/i, /privacy|data/i, /AI/, /launch|available/i, /iPhone/]) assert.match(qs.join("\n"), topic);
  assert.match(h, /<footer/);
  assert.match(h, /<a href="\.\.\/privacy\/">/);
});
