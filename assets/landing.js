// The landing page's live character and scroll choreography (from the approved prototype).
// Libraries arrive as classic scripts before this module runs: gsap, ScrollTrigger, confetti. Motivo is drawn through the avatar module.
// Scrolling itself is native: the page snaps one screen at a time, and nothing here smooths or hijacks it.
import * as avatar from "./avatar.js";
import { HERO, MINIS, FACES } from "./avatar-looks.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const params = new URLSearchParams(location.search);
if (matchMedia("(prefers-reduced-motion: reduce)").matches || params.has("rm")) document.documentElement.classList.add("rm");
const REDUCED = document.documentElement.classList.contains("rm");
const desktop = () => innerWidth >= 900;

/* ---------------- stars ---------------- */
{
  const sky = $("#sky");
  for (let i = 0; i < 70; i++) {
    const b = document.createElement("b");
    b.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;animation-delay:${-Math.random() * 4}s;opacity:${.2 + Math.random() * .5};transform:scale(${.6 + Math.random() * 1.2})`;
    sky.appendChild(b);
  }
}

/* ---------------- the look ---------------- */
const look = { ...HERO };
const svgHost = $("#mo-svg");
let G = {};
function draw() {
  svgHost.innerHTML = avatar.render(look, 1000);
  G = {};
  for (const k of ["skin", "hairb", "hairf", "brows", "eyes", "fhair", "mouth", "acc"]) G[k] = svgHost.querySelector("#bh-" + k);
  G.eyes.innerHTML = '<g class="blink">' + G.eyes.innerHTML + "</g>"; // blinking and gazing must not fight
  G.blink = G.eyes.firstChild;
  collectPupils();
}
function collectPupils() {
  const paths = $$("g.blink > g > path", svgHost);
  G.pupils = look.eyes === "cute" && paths.length >= 10 ? [2, 3, 4, 7, 8, 9].map((i) => paths[i]) : [];
}
function setPart(kind, name) {
  const grp = kind === "eyes" ? G.eyes : kind === "mouth" ? G.mouth : G.brows;
  const inner = avatar.part(kind, name, look);
  if (kind === "eyes") { look.eyes = name; grp.innerHTML = '<g class="blink">' + inner + "</g>"; G.blink = grp.firstChild; collectPupils(); }
  else if (kind === "mouth") { look.mouth = name; grp.innerHTML = inner; }
  else { look.eyebrows = name; grp.innerHTML = inner; }
}
let faceName = "";
function face(name) {
  if (name === faceName) return;
  faceName = name;
  const f = FACES[name];
  if (look.eyes !== f.eyes) setPart("eyes", f.eyes);
  if (look.eyebrows !== f.brows) setPart("brows", f.brows);
  if (look.mouth !== f.mouth) setPart("mouth", f.mouth);
}
draw(); face("worried");

/* ---------------- speech bubble and chat message ---------------- */
const say = $("#say");
let sayText = "", sayTimer;
/** Show a line. `from` ("you" or "motivo") shows it as a chat message from that sender; the reader's gets Motivo's typing dots. `amber` tints it. */
function speak(text, { amber = false, from = "" } = {}) {
  if (text === sayText) return;
  sayText = text;
  clearTimeout(sayTimer);
  if (!text) { say.classList.remove("on"); return; }
  say.classList.remove("on");
  sayTimer = setTimeout(() => {
    say.textContent = text;
    if (from) { const label = document.createElement("span"); label.className = "from"; label.textContent = from === "you" ? "YOU · NOW" : "MOTIVO · NOW"; say.prepend(label); }
    say.classList.toggle("amber", amber);
    say.classList.toggle("chat", !!from);
    say.classList.toggle("you", from === "you");
    say.classList.toggle("motivo", from === "motivo");
    say.classList.add("on");
  }, say.textContent && !REDUCED ? 120 : 0);
}

/* ---------------- placement: follow the active anchor ---------------- */
const mo = $("#mo"), squash = $("#mo-squash"), tilt = $("#mo-tilt"), jump = $("#mo-jump");
const W = 520;
// Each spot belongs to the stretch of page where it is in charge: its own screen, or a whole section when it sits on a rail.
const anchors = $$("[data-anchor]").map((el) => {
  const rail = el.closest(".rail");
  return { el, rail, sec: el.closest("section"), zone: rail ? el.closest("section") : el.closest(".snap") || el.closest("section") };
});
const st = { x: 0, y: 0, s: 1, init: false };
let lastScroll = scrollY, vScroll = 0;
function active() {
  const mid = innerHeight * .5;
  for (const a of anchors) { const r = a.zone.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) return a; }
  return anchors[scrollY < innerHeight ? 0 : anchors.length - 1];
}
let curAnchor = anchors[0];
const centre = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, d: r.width }; };

/** Where the character should be. A spot on a rail that has not reached the top yet is measured where the rail will rest,
 *  so the character goes straight there instead of riding in with the section. */
function target(a) {
  const c = centre(a.el);
  if (a.rail) { const top = a.rail.getBoundingClientRect().top; if (top > 0) c.y -= top; }
  return c;
}

/* ---------------- gaze: finger, mouse, tilt, or the thing being talked about ---------------- */
const gaze = { x: 0, y: 0, tx: 0, ty: 0 };
let pointer = null, pointerAt = 0, lookEl = null, wander = false, wanderT = 0, orient = null;
const setPointer = (x, y) => { pointer = { x, y }; pointerAt = performance.now(); };
addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") setPointer(e.clientX, e.clientY); }, { passive: true });
// A finger on the screen is followed too; this is what happens when tilt is unavailable or refused.
addEventListener("touchstart", (e) => { const t = e.touches[0]; if (t) setPointer(t.clientX, t.clientY); }, { passive: true });
addEventListener("touchmove", (e) => { const t = e.touches[0]; if (t) setPointer(t.clientX, t.clientY); }, { passive: true });
const onOrient = (e) => { if (e.gamma != null) orient = { x: clamp(e.gamma / 30, -1, 1), y: clamp((e.beta - 50) / 30, -1, 1) }; };
if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
  // iOS: ask on the first click (a real tap, never a scroll swipe) that isn't on a form or a link. Never on load.
  // If iOS refuses to show the question (it throws or rejects), listen again for the next tap.
  const arm = () => addEventListener("click", ask, { once: true });
  const ask = (e) => {
    if (e.target.closest("input, textarea, select, form, a")) { arm(); return; }
    try {
      DeviceOrientationEvent.requestPermission()
        .then((answer) => { if (answer === "granted") addEventListener("deviceorientation", onOrient, { passive: true }); })
        .catch(arm);
    } catch { arm(); }
  };
  if (!REDUCED) arm();
} else {
  addEventListener("deviceorientation", onOrient, { passive: true });
}

/* ---------------- main loop ---------------- */
function frame() {
  const a = active();
  curAnchor = a;
  const t = target(a);
  const ts = (t.d / .664) / W;
  if (!st.init || REDUCED) { st.x = t.x; st.y = t.y; st.s = ts; st.init = true; }
  const k = REDUCED ? 1 : .11;
  const px = st.x, py = st.y;
  st.x += (t.x - st.x) * k; st.y += (t.y - st.y) * k; st.s += (ts - st.s) * k;
  const vx = st.x - px, vy = st.y - py;
  mo.style.transform = `translate(${(st.x - W / 2).toFixed(2)}px,${(st.y - .63 * W).toFixed(2)}px) scale(${st.s.toFixed(4)})`;
  const sk = clamp(vy * .0045, -.14, .14);
  squash.style.transform = REDUCED ? "" : `scale(${1 - sk * .6},${1 + sk})`;
  const now = performance.now();
  const cx = st.x, cy = st.y;
  let gx = 0, gy = 0, ease = .13;
  if (pointer && now - pointerAt < 2500) {
    gx = clamp((pointer.x - cx) / (innerWidth * .32), -1, 1); gy = clamp((pointer.y - cy) / (innerHeight * .32), -1, 1);
  } else if (lookEl) {
    const lr = lookEl.getBoundingClientRect();
    gx = clamp((lr.left + lr.width / 2 - cx) / (innerWidth * .3), -1, 1); gy = clamp((lr.top + lr.height / 2 - cy) / (innerHeight * .3), -1, 1);
  } else if (orient) { gx = orient.x; gy = orient.y; }
  else if (wander) {
    ease = .045; // a slow drift between resting points, so idle eyes never dart
    if (now > wanderT) { wanderT = now + 3000 + Math.random() * 2000; gaze.tx = [-1, 1, .6, -.6, 0][Math.floor(Math.random() * 5)]; gaze.ty = [-.5, .4, 0, -.8][Math.floor(Math.random() * 4)]; }
    gx = gaze.tx; gy = gaze.ty;
  } else { gx = Math.sin(now / 2300) * .35; gy = Math.cos(now / 3100) * .2 + clamp(vScroll * .02, -.6, .6); }
  if (REDUCED) { gx = 0; gy = 0; }
  gaze.x += (gx - gaze.x) * ease; gaze.y += (gy - gaze.y) * ease;
  const X = gaze.x, Y = gaze.y;
  const T = (g, kx, ky) => g && g.setAttribute("transform", `translate(${(X * kx).toFixed(1)} ${(Y * ky).toFixed(1)})`);
  T(G.skin, 8, 5); T(G.hairb, 3, 2); T(G.brows, 22, 13); T(G.eyes, 26, 16); T(G.fhair, 18, 10);
  T(G.mouth, 18, 10); T(G.hairf, 12, 7); T(G.acc, 24, 15);
  const pt = `translate(${(X * 13).toFixed(1)} ${(Y * 10).toFixed(1)})`;
  if (G.pupils) for (const p of G.pupils) p.setAttribute("transform", pt);
  tilt.style.transform = REDUCED ? "" : `rotate(${(X * 3.5 + clamp(vx * .25, -6, 6)).toFixed(2)}deg)`;
  placeSay(a);
  requestAnimationFrame(frame);
}
function placeSay(a) {
  if (!sayText) return;
  let side = (desktop() ? a.el.dataset.sayD : a.el.dataset.sayM) || "top";
  if (side === "none") { say.style.visibility = "hidden"; return; } // a spot with no room for a bubble on this layout
  const w = say.offsetWidth, h = say.offsetHeight;
  const S = st.s * W, R = S * .332, cx = st.x, cy = st.y;
  const gap = say.classList.contains("you") ? 48 : 16; // room below the message for Motivo's typing dots
  // The message stays below the corner button while that button is showing.
  const early = $(".early"), ceil = early.classList.contains("away") ? 12 : early.getBoundingClientRect().bottom + 8;
  // The message may tuck over the top of his hair, never his face; with less room than that it stays unsaid.
  const tuck = .1 * S;
  if (side === "top" && cy - .4 * S + tuck - h - gap < ceil) { say.style.visibility = "hidden"; return; }
  let l, t;
  if (side === "top") { l = cx - w / 2; t = cy - .4 * S - h - gap; }
  else { l = cx + R + gap; t = cy - h / 2; } // "right"
  const cl = clamp(l, 12, innerWidth - w - 12);
  say.classList.remove("top", "right");
  say.classList.add(side);
  say.style.setProperty("--tx", (cx - cl) + "px");
  // Hidden while its character is off screen.
  const off = cy - R < 0 || cy > innerHeight; // the head has left the screen
  say.style.visibility = off ? "hidden" : "visible";
  say.style.left = cl + "px"; say.style.top = clamp(t, ceil, innerHeight - h - 8) + "px";
}

/* ---------------- blinking ---------------- */
function blink() {
  if (G.blink && look.eyes === "cute") {
    gsap.fromTo(G.blink, { scaleY: 1, svgOrigin: "500 555" }, { scaleY: .06, svgOrigin: "500 555", duration: .07, yoyo: true, repeat: 1, ease: "power1.inOut" });
  }
  setTimeout(blink, 4000 + Math.random() * 3000);
}
if (!REDUCED) setTimeout(blink, 1500);

/* ---------------- confetti & party ---------------- */
const cf = confetti.create($("#confetti"), { resize: true, useWorker: false, disableForReducedMotion: true });
const hop = () => {
  if (REDUCED) return;
  gsap.timeline().to(jump, { y: -70, duration: .22, ease: "power2.out" }).to(jump, { y: 0, duration: .5, ease: "bounce.out" })
    .to(jump, { y: -34, duration: .16, ease: "power2.out" }).to(jump, { y: 0, duration: .4, ease: "bounce.out" });
  gsap.fromTo(tilt, { rotation: -8 }, { rotation: 0, duration: 1, ease: "elastic.out(1,.3)" });
};
function celebrate(line = "YES! That's one!") {
  face("party"); speak(line);
  if (REDUCED) return;
  const x = st.x / innerWidth, y = (st.y - st.s * W * .2) / innerHeight;
  const colors = ["#2dd4bf", "#f59e0b", "#89D86F", "#ffffff", "#ea580c"];
  cf({ particleCount: 90, spread: 80, startVelocity: 48, origin: { x, y }, colors, scalar: 1.1, ticks: 220 });
  setTimeout(() => cf({ particleCount: 60, angle: 60, spread: 70, origin: { x: 0, y: .75 }, colors }), 160);
  setTimeout(() => cf({ particleCount: 60, angle: 120, spread: 70, origin: { x: 1, y: .75 }, colors }), 160);
  hop();
}

/* ---------------- text split ---------------- */
function split(el) {
  const out = [];
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((tok) => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(" ")); return; }
          const w = document.createElement("span"); w.className = "w";
          const i = document.createElement("span"); i.textContent = tok; w.appendChild(i); frag.appendChild(w); out.push(i);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
    });
  };
  walk(el); return out;
}

/* ---------------- content builders ---------------- */
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
{ // chord diagrams
  const defs = { G: [[6, 3], [5, 2], [1, 3]], C: [[5, 3], [4, 2], [2, 1]], D: [[3, 2], [2, 3], [1, 2]] };
  $("#chords").innerHTML = Object.entries(defs).map(([n, dots]) => {
    let s = '<svg viewBox="0 0 70 84" aria-hidden="true"><g stroke="#5b7787" stroke-width="2" stroke-linecap="round">';
    for (let i = 0; i < 6; i++) s += `<line x1="${10 + i * 10}" y1="10" x2="${10 + i * 10}" y2="74"/>`;
    for (let f = 0; f <= 4; f++) s += `<line x1="10" y1="${10 + f * 16}" x2="60" y2="${10 + f * 16}" ${f === 0 ? 'stroke="#cfe0e6" stroke-width="4"' : ""}/>`;
    s += "</g>";
    dots.forEach(([str, fret], i) => { s += `<circle class="dot" cx="${10 + (6 - str) * 10}" cy="${10 + fret * 16 - 8}" r="6.4" fill="${i % 2 ? "#f59e0b" : "#2dd4bf"}"/>`; });
    return `<div class="chord">${s}</svg><b>${n}</b></div>`;
  }).join("");
}
// voice bars in the "Just talk" screen
$$("[data-wave]").forEach((w) => { w.innerHTML = Array.from({ length: 22 }, (_, i) => `<i style="--i:${i};--h:${(.3 + .7 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * .6))).toFixed(2)}"></i>`).join(""); });
// the small characters inside the phone screens
{
  $$("[data-mini]").forEach((el) => { el.innerHTML = avatar.render(MINIS[el.dataset.mini], 300); });
}
// play the phone loops only while they are on screen
{
  const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle("live", e.isIntersecting && !REDUCED)), { threshold: .35 });
  $$(".cap").forEach((c) => io.observe(c));
}

/* ---------------- customiser ---------------- */
// Fetch the drawing library once the page has settled, so restyling answers at once without slowing the first screen.
addEventListener("load", () => (window.requestIdleCallback ?? setTimeout)(() => avatar.ready().catch(() => {})));
const OPT = {
  hair: [["short", "Classic Short"], ["bun", "Messy Bun"], ["afro", "Curly Volume"], ["bob", "Straight Bob"], ["mohawk", "Mohawk"], ["pixie", "Pixie Cut"]],
  accessory: [["none", "None"], ["tinyGlasses", "Simple"], ["roundGlasses", "Round"], ["shades", "Shades"]],
};
const SW = {
  clothingColor: ["green", "teal", "amber", "pink", "blue", "red", "white", "black"],
  skinTone: ["light", "yellow", "brown", "red", "dark", "black"],
};
const bhColor = (field, id) => avatar.colors[field === "skinTone" ? "skin" : "clothing"][id].base;
let persona = null;
$$("[data-ctl]").forEach((box) => {
  const f = box.dataset.ctl;
  if (OPT[f]) box.innerHTML = OPT[f].map(([id, l]) => `<button type="button" class="chip" aria-pressed="${look[f] === id}" data-v="${id}">${l}</button>`).join("");
  else box.innerHTML = SW[f].map((id) => `<button type="button" class="sw" aria-label="${id}" aria-pressed="${look[f] === id}" data-v="${id}" style="background:${bhColor(f, id)}"></button>`).join("");
  box.addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    await avatar.ready(); // a restyled Motivo is drawn by the library
    $$("button", box).forEach((x) => x.setAttribute("aria-pressed", x === b));
    look[f] = b.dataset.v;
    const keep = faceName; faceName = ""; draw(); face(keep);
    if ((f === "hair" || f === "accessory") && !persona) {
      const lines = { hair: ["Ooh, new hair!", "Fresh cut.", "That suits me."], accessory: ["Looking sharp.", "Can you see me now?", "Very smart."] }[f];
      speak(lines[Math.floor(Math.random() * lines.length)]);
    }
    if (!REDUCED) gsap.fromTo(squash, { rotation: -4 }, { rotation: 0, duration: .8, ease: "elastic.out(1,.35)" });
  });
});
const PERS = [
  { id: "supportive", name: "Supportive", line: "I'll be here with you. You don't have to do it alone.", c: "#2dd4bf" },
  { id: "understanding", name: "Understanding", line: "I'll listen, understand you, and give you space to talk.", c: "#7dd3c0" },
  { id: "leader", name: "Leader", line: "I'll help you take action and keep moving forward.", c: "#f59e0b" },
];
$("#pers").innerHTML = PERS.map((p) => `<button type="button" class="chip" style="--c:${p.c}" data-p="${p.id}" aria-pressed="false"><strong>${p.name}</strong><small>${p.line}</small></button>`).join("");
$("#pers").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  persona = PERS.find((x) => x.id === b.dataset.p);
  $$("#pers button").forEach((x) => x.setAttribute("aria-pressed", x === b));
  applyPersona(persona);
});
function applyPersona(p) {
  face(p.id);
  document.documentElement.style.setProperty("--ring", p.c);
  speak(p.line, { amber: p.id === "leader" });
  if (REDUCED) return;
  if (p.id === "supportive") gsap.fromTo(jump, { scale: .92, rotation: -5 }, { scale: 1, rotation: 0, duration: .9, ease: "elastic.out(1,.35)" });
  if (p.id === "understanding") gsap.fromTo(jump, { rotation: 7, y: 6 }, { rotation: 0, y: 0, duration: 1.2, ease: "elastic.out(1,.4)" });
  if (p.id === "leader") gsap.fromTo(jump, { y: 14, scale: 1.05 }, { y: 0, scale: 1, duration: .5, ease: "back.out(3)" });
}

/* ---------------- the notification's Done button ---------------- */
$("#doneBtn").addEventListener("click", () => {
  const b = $("#doneBtn"); b.textContent = "Done!";
  celebrate();
  setTimeout(() => { b.textContent = "Done"; if (curAnchor.sec.id === "how") { face("curious"); speak("Same time tomorrow?"); } }, 3200);
});

/* ---------------- early sign-up ---------------- */
// The forms are wired by their own module; the character only reacts to the news.
let signedUp = false;
document.addEventListener("motivo:signedup", () => { signedUp = true; celebrate("You're on the list!"); });

/* ---------------- choreography ---------------- */
gsap.registerPlugin(ScrollTrigger);
addEventListener("scroll", () => { vScroll = scrollY - lastScroll; lastScroll = scrollY; }, { passive: true });

/** Runs `enter` each time a section, or one screen of it, becomes the one in the middle of the screen. */
function onScreen(el, enter) {
  ScrollTrigger.create({ trigger: el, start: "top 50%", end: "bottom 50%", onToggle: (s) => { if (s.isActive) { lookEl = null; enter(el); } } });
}
const onSection = (id, enter) => onScreen($("#" + id), enter);
const anchorLine = (sec) => $("[data-anchor]", sec).dataset.say || "";

// The corner "Get early access" button steps aside once the sign-up screen, which it points to, is in view.
new IntersectionObserver(([e]) => $(".early").classList.toggle("away", e.isIntersecting), { threshold: .3 }).observe($("#get"));

// First screen: Motivo waves hello. On the next, the hero, it turns worried and wanders, wondering where to start.
let phase = "";
function setPhase(p) {
  const changed = p !== phase; phase = p;
  if (signedUp) return;
  if (p === "hook") { wander = true; face("worried"); speak($("#hero [data-anchor]").dataset.think, { from: "you" }); }
  else {
    wander = false; face("hello"); speak(anchorLine($("#meet")), { from: "motivo" });
    if (changed && !REDUCED) gsap.timeline().to(tilt, { rotation: -9, duration: .16 }).to(tilt, { rotation: 8, duration: .2 }).to(tilt, { rotation: -6, duration: .18 }).to(tilt, { rotation: 0, duration: .5, ease: "elastic.out(1,.4)" });
  }
}
setPhase("meet");
onSection("meet", () => setPhase("meet"));
onSection("hero", () => setPhase("hook"));

if (!REDUCED) {
  // Scrubbed between the two snapped screens: fully Meet Motivo on the first, fully the hero on the second.
  const tl = gsap.timeline({ scrollTrigger: { trigger: "#hero", start: "top bottom", end: "top top", scrub: .5 } });
  tl.to("#meet .line", { yPercent: -60, opacity: 0, rotation: -3, stagger: .05, duration: .3, ease: "power3.in" })
    .from(".qm", { scale: 0, rotation: -180, opacity: 0, stagger: .03, duration: .25, ease: "back.out(2)" }, ">-.05")
    .from("#hook .line", { yPercent: 60, opacity: 0, rotation: 4, stagger: .06, duration: .35, ease: "back.out(1.6)" }, "<");
}

// How it works: reveal, gaze and a line per beat.
$$(".beat").forEach((beat, i) => {
  const h = $("[data-split]", beat);
  const words = h ? split(h) : [];
  const kick = $(".kick", beat);
  if (!REDUCED) {
    const tl = gsap.timeline({ scrollTrigger: { trigger: beat, start: "top 62%", toggleActions: "play none none reverse" } });
    if (kick) tl.from(kick, { x: -24, opacity: 0, duration: .4, ease: "power3.out" });
    if (words.length) tl.from(words, { yPercent: 115, rotation: 6, stagger: .06, duration: .7, ease: "power4.out" }, "<.05");
    if (beat.id === "party") tl.from($(".sub", beat), { y: 20, opacity: 0, duration: .5 }, ">-.2");
    else if ($(".goalcard", beat)) tl.from(".goalcard", { x: -80, rotation: -9, opacity: 0, duration: .8, ease: "back.out(1.4)" }, "<.2");
    else if ($(".stepcard", beat)) {
      tl.from(".stepcard", { y: 70, rotation: 6, opacity: 0, duration: .8, ease: "back.out(1.3)" }, "<.2")
        .from(".chord", { y: 30, scale: .6, opacity: 0, stagger: .14, duration: .5, ease: "back.out(2.4)" }, ">-.3")
        .from(".chord .dot", { scale: 0, transformOrigin: "center", stagger: .05, duration: .35, ease: "back.out(3)" }, ">-.4");
    } else if ($(".notif", beat)) {
      tl.from("#notif", { y: -140, opacity: 0, scale: .94, duration: .9, ease: "bounce.out" }, "<.1")
        .from(".hint", { opacity: 0, y: 10, duration: .4 }, ">");
    }
  }
  ScrollTrigger.create({
    trigger: beat, start: "top 50%", end: "bottom 50%",
    onToggle: (s) => {
      if (!s.isActive) return;
      lookEl = beat.dataset.look ? $(beat.dataset.look) : null;
      if (beat.dataset.mood === "party") celebrate();
      else { face(i === 0 ? "curious" : "idle"); speak(beat.dataset.say); }
    },
    onLeaveBack: () => { if (i === 0) lookEl = null; },
  });
});

// Sections whose heading carries the character.
function headingReveal(sec) {
  const h = $("[data-split]", sec);
  const words = h ? split(h) : [];
  if (!REDUCED && words.length) gsap.from(words, { yPercent: 115, rotation: 6, stagger: .07, duration: .8, ease: "power4.out", scrollTrigger: { trigger: sec, start: "top 70%" } });
}
const restingRing = () => document.documentElement.style.setProperty("--ring", persona ? persona.c : "#2dd4bf");

headingReveal($("#can-do"));
if (!REDUCED) $$(".cap").forEach((c, i) => gsap.from(c, { y: 80, opacity: 0, rotation: i % 2 ? 4 : -4, duration: .9, ease: "power3.out", scrollTrigger: { trigger: c, start: "top 85%" } }));
// One line on the first screen; the other screens let the phones talk.
$$("#can-do .capscreen").forEach((scr) => onScreen(scr, () => { face("curious"); speak(anchorLine(scr)); }));

headingReveal($("#yours"));
if (!REDUCED) $$("#yours .panel").forEach((p) => gsap.from(p, { y: 60, opacity: 0, duration: .9, ease: "power3.out", scrollTrigger: { trigger: p, start: "top 85%" } }));
onSection("yours", () => { if (persona) applyPersona(persona); else { face("idle"); speak("Make me yours!"); } });

headingReveal($("#chatbot"));
if (!REDUCED) gsap.from("#chatbot .vs", { y: 60, opacity: 0, stagger: .15, duration: .8, ease: "power3.out", scrollTrigger: { trigger: "#chatbot .versus", start: "top 80%" } });
onSection("chatbot", (sec) => { restingRing(); face("wink"); speak(anchorLine(sec)); });

headingReveal($("#free"));
if (!REDUCED) gsap.from("#free .icons li", { y: 24, opacity: 0, scale: .6, stagger: .05, duration: .5, ease: "back.out(2)", scrollTrigger: { trigger: "#free .plans", start: "top 80%" } });
onSection("free", () => { face("hello"); speak(""); });

headingReveal($("#privacy"));
if (!REDUCED) gsap.timeline({ scrollTrigger: { trigger: "#privacy .tiles", start: "top 85%" } })
  .from("#privacy .lockphone", { y: 30, opacity: 0, scale: .8, duration: .6, ease: "back.out(1.8)" })
  .from("#privacy .lockphone .i", { scale: 0, rotation: -30, duration: .4, ease: "back.out(3)" }, "-=.2")
  .from("#privacy .tiles li", { y: 24, opacity: 0, stagger: .08, duration: .5, ease: "power3.out" }, "-=.2");
onSection("privacy", (sec) => { face("idle"); speak(anchorLine(sec)); });

headingReveal($("#get"));
onSection("get", () => {
  restingRing();
  if (signedUp) { face("party"); speak("You're on the list!"); return; }
  face("party"); speak("Be first. I'll see you there!"); hop();
});

requestAnimationFrame(frame);
addEventListener("load", () => ScrollTrigger.refresh());
