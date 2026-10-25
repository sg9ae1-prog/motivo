// The "make me yours" controls: hair, glasses, colours and personality. Motivo himself does the changing.
import * as avatar from "./avatar.js";
import { PERSONAS, adopt, currentLook, restyle } from "./character.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// Fetch the drawing library a screen before the controls come into view, so restyling answers at once; most readers never need it.
const nearing = new IntersectionObserver(([e]) => {
  if (e.isIntersecting) { nearing.disconnect(); avatar.ready().catch(() => {}); }
}, { rootMargin: "100% 0px" });
nearing.observe($("#yours"));
const OPT = {
  hair: [["short", "Classic Short"], ["bun", "Messy Bun"], ["afro", "Curly Volume"], ["bob", "Straight Bob"], ["mohawk", "Mohawk"], ["pixie", "Pixie Cut"]],
  accessory: [["none", "None"], ["tinyGlasses", "Simple"], ["roundGlasses", "Round"], ["shades", "Shades"]],
};
const SW = {
  clothingColor: ["green", "teal", "amber", "pink", "blue", "red", "white", "black"],
  skinTone: ["light", "yellow", "brown", "red", "dark", "black"],
};
const bhColor = (field, id) => avatar.colors[field === "skinTone" ? "skin" : "clothing"][id].base;
const look = currentLook();
$$("[data-ctl]").forEach((box) => {
  const f = box.dataset.ctl;
  if (OPT[f]) box.innerHTML = OPT[f].map(([id, l]) => `<button type="button" class="chip" aria-pressed="${look[f] === id}" data-v="${id}">${l}</button>`).join("");
  else box.innerHTML = SW[f].map((id) => `<button type="button" class="sw" aria-label="${id}" aria-pressed="${look[f] === id}" data-v="${id}" style="background:${bhColor(f, id)}"></button>`).join("");
  box.addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    await restyle(f, b.dataset.v);
    $$("button", box).forEach((x) => x.setAttribute("aria-pressed", x === b));
  });
});
$("#pers").innerHTML = PERSONAS.map((p) => `<button type="button" class="chip" style="--c:${p.c}" data-p="${p.id}" aria-pressed="false"><strong>${p.name}</strong><small>${p.line}</small></button>`).join("");
$("#pers").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  $$("#pers button").forEach((x) => x.setAttribute("aria-pressed", x === b));
  adopt(b.dataset.p);
});
