// The page's flourishes, once the animation libraries have arrived (gsap, ScrollTrigger and confetti, as classic scripts before this module):
// the entrances as each screen scrolls in, the scrubbed hand-over between the first two screens, and Motivo's bigger moves.
// Motivo himself and every screen's content are already live by now, from their own modules.
import { REDUCED } from "./motion.js";
import { useGestures } from "./character.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const squash = $("#mo-squash"), tilt = $("#mo-tilt"), jump = $("#mo-jump");

// The pause control may have been pressed before the libraries arrived.
if (document.documentElement.classList.contains("motion-paused")) gsap.globalTimeline.pause();

/* ---------------- Motivo's bigger moves ---------------- */
const cf = confetti.create($("#confetti"), { resize: true, useWorker: false, disableForReducedMotion: true });
const colors = ["#2dd4bf", "#f59e0b", "#89D86F", "#ffffff", "#ea580c"];
useGestures({
  hop() {
    gsap.timeline().to(jump, { y: -70, duration: .22, ease: "power2.out" }).to(jump, { y: 0, duration: .5, ease: "bounce.out" })
      .to(jump, { y: -34, duration: .16, ease: "power2.out" }).to(jump, { y: 0, duration: .4, ease: "bounce.out" });
    gsap.fromTo(tilt, { rotation: -8 }, { rotation: 0, duration: 1, ease: "elastic.out(1,.3)" });
  },
  wave() {
    gsap.timeline().to(tilt, { rotation: -9, duration: .16 }).to(tilt, { rotation: 8, duration: .2 }).to(tilt, { rotation: -6, duration: .18 }).to(tilt, { rotation: 0, duration: .5, ease: "elastic.out(1,.4)" });
  },
  wiggle() { gsap.fromTo(squash, { rotation: -4 }, { rotation: 0, duration: .8, ease: "elastic.out(1,.35)" }); },
  persona(id) {
    if (id === "supportive") gsap.fromTo(jump, { scale: .92, rotation: -5 }, { scale: 1, rotation: 0, duration: .9, ease: "elastic.out(1,.35)" });
    if (id === "understanding") gsap.fromTo(jump, { rotation: 7, y: 6 }, { rotation: 0, y: 0, duration: 1.2, ease: "elastic.out(1,.4)" });
    if (id === "leader") gsap.fromTo(jump, { y: 14, scale: 1.05 }, { y: 0, scale: 1, duration: .5, ease: "back.out(3)" });
  },
  confetti(origin) {
    cf({ particleCount: 90, spread: 80, startVelocity: 48, origin, colors, scalar: 1.1, ticks: 220 });
    setTimeout(() => cf({ particleCount: 60, angle: 60, spread: 70, origin: { x: 0, y: .75 }, colors }), 160);
    setTimeout(() => cf({ particleCount: 60, angle: 120, spread: 70, origin: { x: 1, y: .75 }, colors }), 160);
  },
});

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

/* ---------------- entrances ---------------- */
gsap.registerPlugin(ScrollTrigger);

if (!REDUCED) {
  // Scrubbed between the two snapped screens: fully Meet Motivo on the first, fully the hero on the second.
  const tl = gsap.timeline({ scrollTrigger: { trigger: "#hero", start: "top bottom", end: "top top", scrub: .5 } });
  tl.to("#meet .line", { yPercent: -60, opacity: 0, rotation: -3, stagger: .05, duration: .3, ease: "power3.in" })
    .from(".qm", { scale: 0, rotation: -180, opacity: 0, stagger: .03, duration: .25, ease: "back.out(2)" }, ">-.05")
    .from("#hook .line", { yPercent: 60, opacity: 0, rotation: 4, stagger: .06, duration: .35, ease: "back.out(1.6)" }, "<");
}

// How it works: each beat's heading and card arrive as it scrolls in.
$$(".beat").forEach((beat) => {
  const h = $("[data-split]", beat);
  const words = h ? split(h) : [];
  const kick = $(".kick", beat);
  if (REDUCED) return;
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
});

// Sections whose heading carries the character.
function headingReveal(sec) {
  const h = $("[data-split]", sec);
  const words = h ? split(h) : [];
  if (!REDUCED && words.length) gsap.from(words, { yPercent: 115, rotation: 6, stagger: .07, duration: .8, ease: "power4.out", scrollTrigger: { trigger: sec, start: "top 70%" } });
}

headingReveal($("#can-do"));
if (!REDUCED) $$(".cap").forEach((c, i) => gsap.from(c, { y: 80, opacity: 0, rotation: i % 2 ? 4 : -4, duration: .9, ease: "power3.out", scrollTrigger: { trigger: c, start: "top 85%" } }));
headingReveal($("#yours"));
if (!REDUCED) $$("#yours .panel").forEach((p) => gsap.from(p, { y: 60, opacity: 0, duration: .9, ease: "power3.out", scrollTrigger: { trigger: p, start: "top 85%" } }));
headingReveal($("#chatbot"));
if (!REDUCED) gsap.from("#chatbot .vs", { y: 60, opacity: 0, stagger: .15, duration: .8, ease: "power3.out", scrollTrigger: { trigger: "#chatbot .versus", start: "top 80%" } });
headingReveal($("#free"));
if (!REDUCED) gsap.from("#free .icons li", { y: 24, opacity: 0, scale: .6, stagger: .05, duration: .5, ease: "back.out(2)", scrollTrigger: { trigger: "#free .plans", start: "top 80%" } });
headingReveal($("#privacy"));
if (!REDUCED) gsap.timeline({ scrollTrigger: { trigger: "#privacy .tiles", start: "top 85%" } })
  .from("#privacy .lockphone", { y: 30, opacity: 0, scale: .8, duration: .6, ease: "back.out(1.8)" })
  .from("#privacy .lockphone .i", { scale: 0, rotation: -30, duration: .4, ease: "back.out(3)" }, "-=.2")
  .from("#privacy .tiles li", { y: 24, opacity: 0, stagger: .08, duration: .5, ease: "power3.out" }, "-=.2");
headingReveal($("#get"));

/** The reader may already be past some screens by the time this arrives: what is on screen or above it is shown finished, never hidden to play in. */
function revealReached() {
  for (const t of ScrollTrigger.getAll())
    if (!t.vars.scrub && t.animation && t.trigger.getBoundingClientRect().top < innerHeight) t.animation.progress(1);
}
revealReached();
