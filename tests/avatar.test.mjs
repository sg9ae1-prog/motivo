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

test("Motivo's drawings start downloading with the page, not after the main script asks for them", () => {
  for (const f of ["landing.js", "avatar.js", "avatar-looks.js", "avatar-baked.js"])
    assert.match(html, new RegExp(`<link rel="modulepreload" href="assets/${f.replace(".", "\\.")}">`), `${f} is fetched early`);
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
