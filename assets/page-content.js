// Fills in the screens' drawn and moving content: the stars, the typed goal and the small characters. Fixed drawings (the chords,
// the voice bars) are written into the page itself, so no screen shifts when this arrives.
// Needs no animation library, so every screen is whole moments after the first one shows.
import * as avatar from "./avatar.js";
import { MINIS } from "./avatar-looks.js";
import { REDUCED } from "./motion.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------------- stars ---------------- */
{
  const sky = $("#sky");
  for (let i = 0; i < 70; i++) {
    const b = document.createElement("b");
    b.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;animation-delay:${-Math.random() * 4}s;opacity:${.2 + Math.random() * .5};transform:scale(${.6 + Math.random() * 1.2})`;
    sky.appendChild(b);
  }
}

{ // the goal types itself
  const goals = ["learn guitar", "run a 5K", "ace finals", "feel calmer"];
  const el = $("#typed"); let gi = 0, ci = 0, del = false;
  const type = () => {
    const g = goals[gi];
    if (!del) { ci++; if (ci === g.length) { del = true; el.textContent = g; setTimeout(type, 1400); return; } }
    else { ci--; if (ci === 0) { del = false; gi = (gi + 1) % goals.length; } }
    el.textContent = g.slice(0, ci);
    setTimeout(type, del ? 28 : 70);
  };
  if (!REDUCED) { el.textContent = ""; type(); }
}
// the small characters inside the phone screens
$$("[data-mini]").forEach((el) => { el.innerHTML = avatar.render(MINIS[el.dataset.mini], 300); });
// play the phone loops only while they are on screen
{
  const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle("live", e.isIntersecting && !REDUCED)), { threshold: .35 });
  $$(".cap").forEach((c) => io.observe(c));
}

// The corner "Get early access" button steps aside once the sign-up screen, which it points to, is in view.
new IntersectionObserver(([e]) => $(".early").classList.toggle("away", e.isIntersecting), { threshold: .3 }).observe($("#get"));
