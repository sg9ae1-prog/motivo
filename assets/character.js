// Motivo himself: his look, face and words, where he stands, where he looks, and how he reacts to the screen the reader is on.
// Needs no animation library, so he is live moments after the first screen shows. His bigger moves (a hop, a wave, confetti)
// arrive later with the animation libraries, through useGestures(); until then he simply makes them without the flourish.
// Scrolling itself is native: the page snaps one screen at a time, and nothing here smooths or hijacks it.
import * as avatar from "./avatar.js";
import { HERO, FACES } from "./avatar-looks.js";
import { REDUCED } from "./motion.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const desktop = () => innerWidth >= 900;

/* ---------------- gestures: supplied by the animation script once it arrives ---------------- */
/** The moves Motivo makes beyond his face and words. Each is a no-op until useGestures() supplies it. */
const gestures = { hop() {}, wave() {}, wiggle() {}, persona(id) {}, confetti(origin) {} };
/** Supplies some or all of hop(), wave(), wiggle(), persona(id) and confetti({ x, y }) (origin as fractions of the screen). */
export function useGestures(moves) { Object.assign(gestures, moves); }

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
draw(); face("hello");

/** What Motivo currently looks like, field by field. */
export const currentLook = () => ({ ...look });

/** Restyles one field of his look; resolves once he is redrawn. */
export async function restyle(field, value) {
  await avatar.ready(); // a restyled Motivo is drawn by the library
  look[field] = value;
  const keep = faceName; faceName = ""; draw(); face(keep);
  if ((field === "hair" || field === "accessory") && !persona) {
    const lines = { hair: ["Ooh, new hair!", "Fresh cut.", "That suits me."], accessory: ["Looking sharp.", "Can you see me now?", "Very smart."] }[field];
    speak(lines[Math.floor(Math.random() * lines.length)]);
  }
  if (!REDUCED) gestures.wiggle();
}

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

/* ---------------- personas ---------------- */
export const PERSONAS = [
  { id: "supportive", name: "Supportive", line: "I'll be here with you. You don't have to do it alone.", c: "#2dd4bf" },
  { id: "understanding", name: "Understanding", line: "I'll listen, understand you, and give you space to talk.", c: "#7dd3c0" },
  { id: "leader", name: "Leader", line: "I'll help you take action and keep moving forward.", c: "#f59e0b" },
];
let persona = null;
/** Motivo takes on one of PERSONAS, by id. */
export function adopt(id) { persona = PERSONAS.find((p) => p.id === id); applyPersona(persona); }
function applyPersona(p) {
  face(p.id);
  document.documentElement.style.setProperty("--ring", p.c);
  speak(p.line, { amber: p.id === "leader" });
  if (!REDUCED) gestures.persona(p.id);
}
const restingRing = () => document.documentElement.style.setProperty("--ring", persona ? persona.c : "#2dd4bf");

/* ---------------- placement: follow the active anchor ---------------- */
const mo = $("#mo"), squash = $("#mo-squash"), tilt = $("#mo-tilt");
const W = 520;
// Each spot belongs to the stretch of page where it is in charge: its own screen, or a whole section when it sits on a rail.
const anchors = $$("[data-anchor]").map((el) => {
  const rail = el.closest(".rail");
  return { el, rail, sec: el.closest("section"), zone: rail ? el.closest("section") : el.closest(".snap") || el.closest("section") };
});
const st = { x: 0, y: 0, s: 1, init: false };
let lastScroll = scrollY, vScroll = 0;
addEventListener("scroll", () => { vScroll = scrollY - lastScroll; lastScroll = scrollY; }, { passive: true });
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
  if (!st.init || REDUCED) { st.x = t.x; st.y = t.y; st.s = ts; if (!st.init) { $(".poster")?.remove(); mo.hidden = false; } st.init = true; } // the live Motivo takes over from the page's picture
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
    G.blink.animate([{ transform: "scaleY(1)" }, { transform: "scaleY(.06)" }, { transform: "scaleY(1)" }], { duration: 140, easing: "ease-in-out" });
  }
  setTimeout(blink, 4000 + Math.random() * 3000);
}
if (!REDUCED) setTimeout(blink, 1500);

/* ---------------- celebrating ---------------- */
function celebrate(line = "YES! That's one!") {
  face("party"); speak(line);
  if (REDUCED) return;
  gestures.confetti({ x: st.x / innerWidth, y: (st.y - st.s * W * .2) / innerHeight });
  gestures.hop();
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

/* ---------------- reactions to the screen the reader is on ---------------- */
// A section, or one screen of it, is the reader's once it crosses the middle line of the screen.
const reactions = new Map();
const middle = new IntersectionObserver((entries) => {
  for (const e of entries) { const r = reactions.get(e.target); if (e.isIntersecting) r.enter(e.target); else r.leave?.(e); }
}, { rootMargin: "-50% 0px -50% 0px" });
/** Runs `enter` each time `el` becomes the one in the middle of the screen, and `leave` with the observer's entry when it stops being. */
function onScreen(el, enter, leave) {
  reactions.set(el, { enter: (el) => { lookEl = null; enter(el); }, leave });
  middle.observe(el);
}
const onSection = (id, enter) => onScreen($("#" + id), enter);
const anchorLine = (sec) => $("[data-anchor]", sec).dataset.say || "";

// First screen: Motivo waves hello. On the next, the hero, it turns worried and wanders, wondering where to start.
let phase = "";
function setPhase(p) {
  const changed = p !== phase; phase = p;
  if (signedUp) return;
  if (p === "hook") { wander = true; face("worried"); speak($("#hero [data-anchor]").dataset.think, { from: "you" }); }
  else {
    wander = false; face("hello"); speak(anchorLine($("#meet")), { from: "motivo" });
    if (changed && !REDUCED) gestures.wave();
  }
}
setPhase("meet");
onSection("meet", () => setPhase("meet"));
onSection("hero", () => setPhase("hook"));

// How it works: a gaze and a line per beat.
$$(".beat").forEach((beat, i) => onScreen(beat, () => {
  lookEl = beat.dataset.look ? $(beat.dataset.look) : null;
  if (beat.dataset.mood === "party") celebrate();
  else { face(i === 0 ? "curious" : "idle"); speak(beat.dataset.say); }
}, (e) => { if (i === 0 && e.boundingClientRect.top > innerHeight / 2) lookEl = null; }));

// One line on the first screen of what Motivo can do; the other screens let the phones talk.
$$("#can-do .capscreen").forEach((scr) => onScreen(scr, () => { face("curious"); speak(anchorLine(scr)); }));
onSection("yours", () => { if (persona) applyPersona(persona); else { face("idle"); speak("Make me yours!"); } });
onSection("chatbot", (sec) => { restingRing(); face("wink"); speak(anchorLine(sec)); });
onSection("free", () => { face("hello"); speak(""); });
onSection("privacy", (sec) => { face("idle"); speak(anchorLine(sec)); });
onSection("get", () => {
  restingRing();
  if (signedUp) { face("party"); speak("You're on the list!"); return; }
  face("party"); speak("Be first. I'll see you there!");
  if (!REDUCED) gestures.hop();
});

requestAnimationFrame(frame);
