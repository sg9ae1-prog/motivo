import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { HERO, MINIS, FACES, renderKey, partKey } from "../assets/avatar-looks.js";
import { BAKED } from "../assets/avatar-baked.js";

// Motivo arrives with the page as ready-made drawings; the 370 KB drawing library is only needed once the reader restyles him.
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const html = read("../index.html");
const js = read("../assets/landing.js");

globalThis.window = globalThis;
vm.runInThisContext(read("../assets/bigheads.js"));
const lib = window.Motivo;

test("the page does not wait for the drawing library before it shows Motivo", () => {
  assert.doesNotMatch(html, /<script[^>]*src="assets\/bigheads\.js"/, "no blocking library script in the page");
  assert.doesNotMatch(js, /\bMotivo\.(render|part|colors)\b/, "the landing page draws only through the avatar module");
});

test("every drawing the page shows before any restyling is ready-made and matches the library exactly", () => {
  assert.equal(BAKED.renders[renderKey(HERO, 1000)], lib.render(HERO, 1000), "the hero");
  for (const [name, look] of Object.entries(MINIS)) assert.equal(BAKED.renders[renderKey(look, 300)], lib.render(look, 300), `mini ${name}`);
  for (const f of Object.values(FACES)) {
    for (const [kind, name] of [["eyes", f.eyes], ["brows", f.brows], ["mouth", f.mouth]])
      assert.equal(BAKED.parts[partKey(kind, name, HERO)], lib.part(kind, name, HERO), `${kind} ${name}`);
  }
});

test("the restyling swatches have their colours without the library", () => {
  assert.deepEqual(BAKED.colors.skin, lib.colors.skin);
  assert.deepEqual(BAKED.colors.clothing, lib.colors.clothing);
});

test("a look that was never baked asks for the library instead of drawing the wrong Motivo", async () => {
  const { render } = await import("../assets/avatar.js");
  const saved = window.Motivo; delete window.Motivo;
  try { assert.throws(() => render({ ...HERO, hair: "afro" }, 1000), /library/); }
  finally { window.Motivo = saved; }
  assert.equal(render({ ...HERO, hair: "afro" }, 1000), lib.render({ ...HERO, hair: "afro" }, 1000), "once loaded, the library draws it");
});

test("the ready-made drawings are small next to the library they replace on first load", () => {
  const kb = read("../assets/avatar-baked.js").length / 1024;
  assert.ok(kb < 120, `baked drawings are ${kb.toFixed(0)} KB before compression`);
});

// Motivo is in the page itself, so the first screen shows him before any script has downloaded.
const css = read("../assets/landing.css");
const poster = html.match(/<div class="poster" aria-hidden="true">(<svg[\s\S]*?<\/svg>)<\/div>/)?.[1];

test("the first screen carries a ready-made picture of Motivo, identical to the live drawing", () => {
  assert.ok(poster, "a picture sits in the page");
  const meet = html.slice(html.indexOf('<section id="meet"'), html.indexOf("</section>", html.indexOf('<section id="meet"')));
  assert.ok(meet.includes(poster), "inside the first screen's spot for him");
  assert.equal(poster.replace(/-poster\b/g, ""), lib.render(HERO, 1000), "the same drawing the live Motivo starts as");
  assert.doesNotMatch(poster, /id="(?![^"]*-poster")/, "its inner names never clash with the live drawing's");
});

test("the picture sits exactly where the live Motivo is placed: same width and the same point on the spot's centre", () => {
  const rule = css.match(/^\.poster \{([^}]*)\}/m)?.[1] ?? "";
  assert.match(rule, /width: 150\.6%/, "the live drawing is the spot's width divided by .664");
  assert.match(rule, /aspect-ratio: 520 \/ 515/, "the live drawing's box");
  assert.match(rule, /translate\(-50%, -63\.6%\)/, "the live drawing's anchor point");
  assert.match(js, /W = 520/, "the live box is still 520 wide");
  assert.match(css, /#mo \{[^}]*width: 520px; height: 515px;[^}]*transform-origin: 50% 63\.6%/, "and still anchored at the same point");
});

test("the picture leaves in the same frame the live Motivo is first placed, so he never shows twice", () => {
  const init = js.match(/if \(!st\.init[^\n]*\n/)?.[0] ?? "";
  assert.match(init, /\.poster/, "removed where the live one takes its first position");
  assert.match(html, /<div id="mo" aria-hidden="true" hidden>/, "the live one's glow and ring stay out of sight until he is placed");
  assert.match(init, /mo\.hidden = false/, "and appear where he is first placed");
});
