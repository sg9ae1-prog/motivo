(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const params = new URLSearchParams(location.search);
if (RM || params.has('rm')) document.documentElement.classList.add('rm');
const REDUCED = document.documentElement.classList.contains('rm');
const desktop = () => innerWidth >= 900;
const fine = matchMedia('(pointer:fine)').matches;

/* ---------------- stars ---------------- */
{
  const sky = $('#sky');
  for (let i = 0; i < 70; i++) {
    const b = document.createElement('b');
    b.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;animation-delay:${-Math.random() * 4}s;opacity:${.2 + Math.random() * .5};transform:scale(${.6 + Math.random() * 1.2})`;
    sky.appendChild(b);
  }
}

/* ---------------- the look ---------------- */
const look = {
  skinTone: 'light', eyes: 'cute', eyebrows: 'raised', mouth: 'openSmile',
  hair: 'short', hairColor: 'black', facialHair: 'none',
  clothing: 'shirt', clothingColor: 'green', accessory: 'none', graphic: 'none',
  hat: 'none', hatColor: 'blue', body: 'chest', bgShape: 'circle', bgColor: 'turqoise',
  lipColor: 'red', lashes: false
};
const svgHost = $('#mo-svg');
let G = {}; // group handles
function draw() {
  svgHost.innerHTML = Motivo.render(look, 1000);
  G = {};
  for (const k of ['skin', 'hairb', 'hairf', 'brows', 'eyes', 'fhair', 'mouth', 'acc']) G[k] = svgHost.querySelector('#bh-' + k);
  // wrap eyes so blinking and gazing don't fight
  G.eyes.innerHTML = '<g class="blink">' + G.eyes.innerHTML + '</g>';
  G.blink = G.eyes.firstChild;
  collectPupils();
}
function collectPupils() {
  const paths = $$('g.blink > g > path', svgHost);
  G.pupils = look.eyes === 'cute' && paths.length >= 10 ? [2, 3, 4, 7, 8, 9].map(i => paths[i]) : [];
}
function setPart(kind, name) {
  const grp = kind === 'eyes' ? G.eyes : kind === 'mouth' ? G.mouth : G.brows;
  const inner = Motivo.part(kind, name, look);
  if (kind === 'eyes') { look.eyes = name; grp.innerHTML = '<g class="blink">' + inner + '</g>'; G.blink = grp.firstChild; collectPupils(); }
  else if (kind === 'mouth') { look.mouth = name; grp.innerHTML = inner; }
  else { look.eyebrows = name; grp.innerHTML = inner; }
}
const FACES = {
  idle:     { eyes: 'cute', brows: 'raised', mouth: 'openSmile' },
  worried:  { eyes: 'cute', brows: 'concerned', mouth: 'sad' },
  hello:    { eyes: 'cute', brows: 'raised', mouth: 'openSmile' },
  curious:  { eyes: 'cute', brows: 'raised', mouth: 'grin' },
  party:    { eyes: 'happy', brows: 'raised', mouth: 'open' },
  talk:     { eyes: 'cute', brows: 'raised', mouth: 'open' },
  wink:     { eyes: 'wink', brows: 'raised', mouth: 'openSmile' },
  supportive:    { eyes: 'happy', brows: 'raised', mouth: 'openSmile' },
  understanding: { eyes: 'cute', brows: 'concerned', mouth: 'grin' },
  leader:        { eyes: 'cute', brows: 'serious', mouth: 'openSmile' }
};
let faceName = '';
function face(name) {
  if (name === faceName) return;
  faceName = name;
  const f = FACES[name];
  if (look.eyes !== f.eyes) setPart('eyes', f.eyes);
  if (look.eyebrows !== f.brows) setPart('brows', f.brows);
  if (look.mouth !== f.mouth) setPart('mouth', f.mouth);
}
draw(); face('idle');

/* ---------------- speech bubble ---------------- */
const say = $('#say');
let sayText = '', sayTimer;
function speak(text, amber) {
  if (text === sayText) return;
  sayText = text;
  clearTimeout(sayTimer);
  say.classList.toggle('amber', !!amber);
  if (!text) { say.classList.remove('on'); return; }
  say.classList.remove('on');
  sayTimer = setTimeout(() => { say.textContent = text; say.classList.add('on'); }, say.textContent && sayText ? 120 : 0);
}

/* ---------------- placement: follow the active anchor ---------------- */
const mo = $('#mo'), squash = $('#mo-squash'), tilt = $('#mo-tilt'), jump = $('#mo-jump');
const W = 520;
const anchors = $$('[data-anchor]').map(el => ({ el, sec: el.closest('section') }));
const st = { x: 0, y: 0, s: 1, init: false };
let lastScroll = scrollY, vScroll = 0;
function active() {
  const mid = innerHeight * .5;
  for (const a of anchors) { const r = a.sec.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) return a; }
  return anchors[scrollY < innerHeight ? 0 : anchors.length - 1];
}
let curAnchor = anchors[0];

/* ---------------- gaze ---------------- */
const gaze = { x: 0, y: 0, tx: 0, ty: 0 };
let pointer = null, pointerAt = 0, lookEl = null, wander = false, wanderT = 0, orient = null;
addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { pointer = { x: e.clientX, y: e.clientY }; pointerAt = performance.now(); } }, { passive: true });
addEventListener('deviceorientation', e => { if (e.gamma != null) orient = { x: clamp(e.gamma / 30, -1, 1), y: clamp((e.beta - 50) / 30, -1, 1) }; }, { passive: true });

/* ---------------- main loop ---------------- */
let party = 0; // seconds of jump left
function frame(t) {
  const a = active();
  curAnchor = a;
  const r = a.el.getBoundingClientRect();
  const D = r.width, tx = r.left + r.width / 2, ty = r.top + r.height / 2, ts = (D / .664) / W;
  if (!st.init || REDUCED) { st.x = tx; st.y = ty; st.s = ts; st.init = true; }
  const k = REDUCED ? 1 : .11;
  const px = st.x, py = st.y;
  st.x += (tx - st.x) * k; st.y += (ty - st.y) * k; st.s += (ts - st.s) * k;
  const vx = st.x - px, vy = st.y - py;
  mo.style.transform = `translate(${(st.x - W / 2).toFixed(2)}px,${(st.y - .63 * W).toFixed(2)}px) scale(${st.s.toFixed(4)})`;
  // squash & stretch + lean from motion
  const sk = clamp(vy * .0045, -.14, .14);
  squash.style.transform = REDUCED ? '' : `scale(${1 - sk * .6},${1 + sk})`;
  // gaze
  const now = performance.now();
  const cx = st.x, cy = st.y;
  let gx = 0, gy = 0;
  if (wander) {
    if (now > wanderT) { wanderT = now + 900 + Math.random() * 1400; gaze.tx = [-1, 1, .6, -.6, 0][Math.floor(Math.random() * 5)]; gaze.ty = [-.5, .4, 0, -.8][Math.floor(Math.random() * 4)]; }
    gx = gaze.tx; gy = gaze.ty;
  } else if (fine && pointer && now - pointerAt < 2500) {
    gx = clamp((pointer.x - cx) / (innerWidth * .32), -1, 1); gy = clamp((pointer.y - cy) / (innerHeight * .32), -1, 1);
  } else if (lookEl) {
    const lr = lookEl.getBoundingClientRect();
    gx = clamp((lr.left + lr.width / 2 - cx) / (innerWidth * .3), -1, 1); gy = clamp((lr.top + lr.height / 2 - cy) / (innerHeight * .3), -1, 1);
  } else if (orient) { gx = orient.x; gy = orient.y; }
  else { gx = Math.sin(now / 2300) * .35; gy = Math.cos(now / 3100) * .2 + clamp(vScroll * .02, -.6, .6); }
  if (REDUCED) { gx = 0; gy = 0; }
  gaze.x += (gx - gaze.x) * .13; gaze.y += (gy - gaze.y) * .13;
  const X = gaze.x, Y = gaze.y;
  const T = (g, kx, ky) => g && g.setAttribute('transform', `translate(${(X * kx).toFixed(1)} ${(Y * ky).toFixed(1)})`);
  T(G.skin, 8, 5); T(G.hairb, 3, 2); T(G.brows, 22, 13); T(G.eyes, 26, 16); T(G.fhair, 18, 10);
  T(G.mouth, 18, 10); T(G.hairf, 12, 7); T(G.acc, 24, 15);
  const pt = `translate(${(X * 13).toFixed(1)} ${(Y * 10).toFixed(1)})`;
  if (G.pupils) for (const p of G.pupils) p.setAttribute('transform', pt);
  tilt.style.transform = REDUCED ? '' : `rotate(${(X * 3.5 + clamp(vx * .25, -6, 6)).toFixed(2)}deg)`;
  // party hop
  if (party > 0) { party -= .016; }
  // speech bubble position
  placeSay(a);
  requestAnimationFrame(frame);
}
function placeSay(a) {
  if (!sayText) return;
  const side = (desktop() ? a.el.dataset.sayD : a.el.dataset.sayM) || 'top';
  const w = say.offsetWidth, h = say.offsetHeight;
  const S = st.s * W, R = S * .332, cx = st.x, cy = st.y;
  let l, t;
  if (side === 'top') { l = cx - w / 2; t = cy - .4 * S - h - 16; }
  else if (side === 'right') { l = cx + R + 16; t = cy - h / 2; }
  else { l = cx - R - 16 - w; t = cy - h / 2; }
  const cl = clamp(l, 12, innerWidth - w - 12);
  say.className = (say.classList.contains('on') ? 'on ' : '') + side + (say.classList.contains('amber') ? ' amber' : '');
  say.style.setProperty('--tx', (cx - cl) + 'px');
  say.style.transform = say.classList.contains('on') ? '' : '';
  say.style.visibility = (side === 'top' && t < 48) ? 'hidden' : 'visible';
  say.style.left = cl + 'px'; say.style.top = clamp(t, 56, innerHeight - h - 8) + 'px';
}

/* ---------------- blinking ---------------- */
function blink() {
  if (!REDUCED && G.blink && look.eyes === 'cute') {
    gsap.fromTo(G.blink, { scaleY: 1, svgOrigin: '500 555' }, { scaleY: .06, svgOrigin: '500 555', duration: .07, yoyo: true, repeat: 1, ease: 'power1.inOut' });
    if (Math.random() < .22) setTimeout(blink, 220); // double blink
  }
  setTimeout(blink, 1800 + Math.random() * 3200);
}
if (!REDUCED) setTimeout(blink, 1500);

/* ---------------- talking ---------------- */
let talking = false, talkTimer;
const TALK = ['open', 'openSmile', 'grin', 'open', 'lips', 'openSmile'];
function setTalking(on) {
  if (on === talking) return;
  talking = on; clearInterval(talkTimer);
  if (on) {
    talkTimer = setInterval(() => setPart('mouth', TALK[Math.floor(Math.random() * TALK.length)]), 130);
    $('#voice').classList.add('live');
  } else { $('#voice').classList.remove('live'); setPart('mouth', FACES[faceName]?.mouth || 'openSmile'); }
}

/* ---------------- confetti & party ---------------- */
const cf = confetti.create($('#confetti'), { resize: true, useWorker: false, disableForReducedMotion: true });
let mood = 'idle', moodTimer;
function celebrate() {
  face('party'); speak('YES! That\'s one!', false);
  const x = st.x / innerWidth, y = (st.y - st.s * W * .2) / innerHeight;
  const colors = ['#2dd4bf', '#f59e0b', '#89D86F', '#ffffff', '#ea580c'];
  cf({ particleCount: 90, spread: 80, startVelocity: 48, origin: { x, y }, colors, scalar: 1.1, ticks: 220 });
  setTimeout(() => cf({ particleCount: 60, angle: 60, spread: 70, origin: { x: 0, y: .75 }, colors }), 160);
  setTimeout(() => cf({ particleCount: 60, angle: 120, spread: 70, origin: { x: 1, y: .75 }, colors }), 160);
  if (!REDUCED) {
    gsap.timeline().to(jump, { y: -70, duration: .22, ease: 'power2.out' }).to(jump, { y: 0, duration: .5, ease: 'bounce.out' })
      .to(jump, { y: -34, duration: .16, ease: 'power2.out' }).to(jump, { y: 0, duration: .4, ease: 'bounce.out' });
    gsap.fromTo(tilt, { rotation: -8 }, { rotation: 0, duration: 1, ease: 'elastic.out(1,.3)' });
  }
}

/* ---------------- text split ---------------- */
function split(el) {
  const out = [];
  const walk = (node) => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(tok => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'w';
          const i = document.createElement('span'); i.textContent = tok; w.appendChild(i); frag.appendChild(w); out.push(i);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
  };
  walk(el); return out;
}

/* ---------------- content builders ---------------- */
// typewriter goals
{
  const goals = ['learn guitar', 'run my first 5K', 'pass my exams', 'draw every day', 'feel calmer'];
  const el = $('#typed'); let gi = 0, ci = 0, del = false;
  const type = () => {
    const g = goals[gi];
    if (REDUCED) { el.textContent = goals[0]; return; }
    if (!del) { ci++; if (ci === g.length) { del = true; setTimeout(type, 1400); el.textContent = g; return; } }
    else { ci--; if (ci === 0) { del = false; gi = (gi + 1) % goals.length; } }
    el.textContent = g.slice(0, ci);
    setTimeout(type, del ? 28 : 70);
  };
  type();
}
// chord diagrams
{
  const defs = { G: [[6, 3], [5, 2], [1, 3]], C: [[5, 3], [4, 2], [2, 1]], D: [[3, 2], [2, 3], [1, 2]] };
  $('#chords').innerHTML = Object.entries(defs).map(([n, dots]) => {
    let s = '<svg viewBox="0 0 70 84" aria-hidden="true"><g stroke="#5b7787" stroke-width="2" stroke-linecap="round">';
    for (let i = 0; i < 6; i++) s += `<line x1="${10 + i * 10}" y1="10" x2="${10 + i * 10}" y2="74"/>`;
    for (let f = 0; f <= 4; f++) s += `<line x1="10" y1="${10 + f * 16}" x2="60" y2="${10 + f * 16}" ${f === 0 ? 'stroke="#cfe0e6" stroke-width="4"' : ''}/>`;
    s += '</g>';
    dots.forEach(([str, fret], i) => { s += `<circle class="dot" cx="${10 + (6 - str) * 10}" cy="${10 + fret * 16 - 8}" r="6.4" fill="${i % 2 ? '#f59e0b' : '#2dd4bf'}"/>`; });
    return `<div class="chord">${s}</svg><b>${n}</b></div>`;
  }).join('');
}
// voice bars
$('#voice').innerHTML = Array.from({ length: 34 }, (_, i) => `<i style="--i:${i};--h:${(.3 + .7 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * .6))).toFixed(2)}"></i>`).join('');

/* ---------------- customizer ---------------- */
const OPT = {
  hair: [['short', 'Short'], ['bun', 'Messy bun'], ['afro', 'Curly'], ['bob', 'Bob'], ['mohawk', 'Mohawk'], ['pixie', 'Pixie']],
  accessory: [['none', 'None'], ['tinyGlasses', 'Simple'], ['roundGlasses', 'Round'], ['shades', 'Shades']]
};
const SW = {
  clothingColor: ['green', 'teal', 'amber', 'pink', 'blue', 'red', 'white', 'black'],
  skinTone: ['light', 'yellow', 'brown', 'red', 'dark', 'black']
};
function bhColor(field, id) {
  const c = Motivo.colors[field === 'skinTone' ? 'skin' : 'clothing'][id]; return c.base;
}
$$('[data-ctl]').forEach(box => {
  const f = box.dataset.ctl;
  if (OPT[f]) box.innerHTML = OPT[f].map(([id, l]) => `<button class="chip" aria-pressed="${look[f] === id}" data-v="${id}">${l}</button>`).join('');
  else box.innerHTML = SW[f].map(id => `<button class="sw" aria-label="${id}" aria-pressed="${look[f] === id}" data-v="${id}" style="background:${bhColor(f, id)}"></button>`).join('');
  box.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', box).forEach(x => x.setAttribute('aria-pressed', x === b));
    look[f] = b.dataset.v;
    const keep = faceName; faceName = ''; draw(); face(keep);
    if (f === 'hair' || f === 'accessory') react(f);
    else gsap.fromTo(jump, { scale: .94 }, { scale: 1, duration: .6, ease: 'elastic.out(1,.4)' });
    if (!REDUCED) gsap.fromTo(squash, { rotation: -4 }, { rotation: 0, duration: .8, ease: 'elastic.out(1,.35)' });
  });
});
function react(f) {
  const lines = { hair: ['Ooh, new hair!', 'Fresh cut.', 'That suits me.'], accessory: ['Looking sharp.', 'Can you see me now?', 'Very smart.'] }[f];
  if (persona) return;
  speak(lines[Math.floor(Math.random() * lines.length)]);
}
const PERS = [
  { id: 'supportive', name: 'Supportive', line: "I'll be here with you. You don't have to do it alone.", c: '#2dd4bf', ring: '#2dd4bf' },
  { id: 'understanding', name: 'Understanding', line: "I'll listen, understand you, and give you space to talk.", c: '#7dd3c0', ring: '#5eead4' },
  { id: 'leader', name: 'Leader', line: "I'll help you take action and keep moving forward.", c: '#f59e0b', ring: '#f59e0b' }
];
let persona = null;
$('#pers').innerHTML = PERS.map(p => `<button class="chip" style="--c:${p.c}" data-p="${p.id}" aria-pressed="false" aria-label="${p.name}: ${p.line}"><strong>${p.name}</strong><small>${p.line}</small></button>`).join('');
$('#pers').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const p = PERS.find(x => x.id === b.dataset.p); persona = p;
  $$('#pers button').forEach(x => x.setAttribute('aria-pressed', x === b));
  applyPersona(p);
});
function applyPersona(p) {
  face(p.id);
  document.documentElement.style.setProperty('--ring', p.ring);
  speak(p.line, p.id === 'leader');
  if (!REDUCED) {
    if (p.id === 'supportive') gsap.fromTo(jump, { scale: .92, rotation: -5 }, { scale: 1, rotation: 0, duration: .9, ease: 'elastic.out(1,.35)' });
    if (p.id === 'understanding') gsap.fromTo(tilt, { x: 0 }, { x: 0, duration: 0 }), gsap.fromTo(jump, { rotation: 7, y: 6 }, { rotation: 0, y: 0, duration: 1.2, ease: 'elastic.out(1,.4)' });
    if (p.id === 'leader') gsap.fromTo(jump, { y: 14, scale: 1.05 }, { y: 0, scale: 1, duration: .5, ease: 'back.out(3)' });
  }
}

/* ---------------- done button ---------------- */
$('#doneBtn').addEventListener('click', () => {
  const b = $('#doneBtn'); b.textContent = 'Done ✓'.replace(' ✓', '!');
  celebrate();
  setTimeout(() => { b.textContent = 'Done'; if (curAnchor.sec.id === 'how') { face('curious'); speak('Same time tomorrow?'); } }, 3200);
});

/* ---------------- choreography ---------------- */
gsap.registerPlugin(ScrollTrigger);
if (fine && !REDUCED && typeof Lenis !== 'undefined') {
  const lenis = new Lenis({ lerp: .09 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
}
addEventListener('scroll', () => { vScroll = scrollY - lastScroll; lastScroll = scrollY; }, { passive: true });

// initial state of the hero
let phase = 'hook';
function setPhase(p) {
  if (p === phase) return; phase = p;
  if (p === 'hook') { wander = true; face('worried'); speak('...so where do I even start?'); }
  else { wander = false; face('hello'); speak("Hi! I'm Motivo."); }
}
wander = true; face('worried');
speak('...so where do I even start?');

if (!REDUCED) {
  const lines = $$('#hook .line');
  gsap.set('#meet', { visibility: 'visible' });
  gsap.set('#meet h1,#meet p,#meet .store', { opacity: 0 });
  const tl = gsap.timeline({ scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: .7 } });
  tl.to({}, { duration: .35 })
    .to(lines, { yPercent: -120, opacity: 0, rotation: -3, stagger: .06, duration: .2, ease: 'power3.in' }, '>')
    .to('.qm', { scale: 0, rotation: 180, opacity: 0, stagger: .03, duration: .2, ease: 'back.in(2)' }, '<')
    .fromTo('#meet h1', { yPercent: 60, opacity: 0, rotation: 4 }, { yPercent: 0, opacity: 1, rotation: 0, duration: .25, ease: 'back.out(1.6)' }, '>')
    .fromTo('#meet p', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .15 }, '>-.08')
    .fromTo('#meet .store', { y: 40, opacity: 0, scale: .9 }, { y: 0, opacity: 1, scale: 1, stagger: .06, duration: .15, ease: 'back.out(2)' }, '>-.06')
    .to({}, { duration: .3 });
  // small pulse on the character as the phase flips
  ScrollTrigger.create({ trigger: '#hero', start: 'top top', end: 'bottom bottom', onUpdate: s => {
    if (!inHero()) return; setPhase(s.progress > .42 ? 'meet' : 'hook'); } });
  gsap.fromTo('#hero .anchor', { scale: 1 }, { scale: .86, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: .7 } });
  gsap.from('.top', { y: -40, opacity: 0, duration: .8, ease: 'power3.out', delay: .2 });
} else {
  phase = 'hook'; setPhase('meet');
}
function inHero() { const r = $('#hero').getBoundingClientRect(); return r.top <= innerHeight * .5 && r.bottom > innerHeight * .5; }

// How it works: reveal + gaze + lines
$$('.beat').forEach((beat, i) => {
  const h = $('[data-split]', beat);
  const words = h ? split(h) : [];
  const card = $('.card,.notif,.voice,.sub', beat);
  const kick = $('.kick', beat);
  if (!REDUCED) {
    const tl = gsap.timeline({ scrollTrigger: { trigger: beat, start: 'top 62%', toggleActions: 'play none none reverse' } });
    if (kick) tl.from(kick, { x: -24, opacity: 0, duration: .4, ease: 'power3.out' });
    if (words.length) tl.from(words, { yPercent: 115, rotation: 6, stagger: .06, duration: .7, ease: 'power4.out' }, '<.05');
    if (beat.id === 'party') tl.from($('.sub', beat), { y: 20, opacity: 0, duration: .5 }, '>-.2');
    else if (beat.querySelector('.goalcard')) tl.from('.goalcard', { x: -80, rotation: -9, opacity: 0, duration: .8, ease: 'back.out(1.4)' }, '<.2');
    else if (beat.querySelector('.stepcard')) {
      tl.from('.stepcard', { y: 70, rotation: 6, opacity: 0, duration: .8, ease: 'back.out(1.3)' }, '<.2')
        .from('.chord', { y: 30, scale: .6, opacity: 0, stagger: .14, duration: .5, ease: 'back.out(2.4)' }, '>-.3')
        .from('.chord .dot', { scale: 0, transformOrigin: 'center', stagger: .05, duration: .35, ease: 'back.out(3)' }, '>-.4');
    } else if (beat.querySelector('.notif')) {
      tl.from('.notif', { y: -140, opacity: 0, scale: .94, duration: .9, ease: 'bounce.out' }, '<.1')
        .from('.hint', { opacity: 0, y: 10, duration: .4 }, '>');
    } else if (beat.id === 'voiceBeat') tl.from(['#voiceBeat .sub', '#voice'], { y: 24, opacity: 0, stagger: .12, duration: .5 }, '>-.3');
  }
  ScrollTrigger.create({
    trigger: beat, start: 'top 55%', end: 'bottom 55%',
    onToggle: s => {
      if (!s.isActive) return;
      const target = beat.dataset.look ? $(beat.dataset.look) : null;
      lookEl = target;
      const m = beat.dataset.mood;
      setTalking(m === 'talk');
      if (m === 'party') { celebrate(); }
      else if (m === 'talk') { face('talk'); speak(beat.dataset.say); }
      else { face(i === 0 ? 'curious' : 'idle'); speak(beat.dataset.say); }
    },
    onLeave: () => { if (beat.dataset.mood === 'talk') setTalking(false); },
    onLeaveBack: () => { lookEl = null; if (beat.dataset.mood === 'talk') setTalking(false); }
  });
});
ScrollTrigger.create({ trigger: '#how', start: 'top 50%', onLeaveBack: () => { lookEl = null; setPhase(inHero() && phase !== 'hook' ? phase : phase); } });

// Yours
{
  const sec = $('#yours');
  const words = split($('h2', sec));
  if (!REDUCED) {
    gsap.from(words, { yPercent: 115, rotation: 6, stagger: .07, duration: .8, ease: 'power4.out', scrollTrigger: { trigger: sec, start: 'top 60%' } });
    gsap.from('#yours .panel', { y: 60, opacity: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: sec, start: 'top 55%' } });
  }
  ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 45%',
    onToggle: s => { if (s.isActive) { lookEl = null; setTalking(false); persona ? applyPersona(persona) : (face('idle'), speak('Make me yours!')); } } });
}
// Close
{
  const sec = $('#close');
  const words = split($('h2', sec));
  if (!REDUCED) {
    gsap.from(words, { yPercent: 115, rotation: 6, stagger: .07, duration: .8, ease: 'power4.out', scrollTrigger: { trigger: sec, start: 'top 65%' } });
    gsap.from('#close .store', { y: 40, opacity: 0, stagger: .1, duration: .6, ease: 'back.out(2)', scrollTrigger: { trigger: sec, start: 'top 55%' } });
  }
  ScrollTrigger.create({ trigger: sec, start: 'top 55%',
    onEnter: () => { face('wink'); speak('See you in there!'); document.documentElement.style.setProperty('--ring', '#2dd4bf');
      if (!REDUCED) gsap.fromTo(jump, { y: 0 }, { y: -40, duration: .3, yoyo: true, repeat: 1, ease: 'power2.out' }); },
    onLeaveBack: () => { if (persona) applyPersona(persona); else { face('idle'); speak('Make me yours!'); } } });
}

// debug helper for screenshots
window.__motivo = { celebrate, face, speak };
requestAnimationFrame(frame);
addEventListener('load', () => ScrollTrigger.refresh());
})();
