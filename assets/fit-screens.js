// Makes every snapped screen fit the viewport it snaps into. Layout only: no animation library, no character.
// A screen whose content is taller than the viewport shrinks the parts marked data-fit (a phone, a panel) just enough;
// parts that share a data-fit name shrink together, so a run of phones stays one size.
// The last screen also leaves room for the footer, so the footer shares it.

const root = document.documentElement;

/** Height the in-flow children of a screen need, edge to edge. Offsets ignore transforms, so entrance animations never skew it. */
function contentHeight(screen) {
  let top = Infinity, bottom = -Infinity;
  for (const el of screen.children) {
    if (!el.offsetParent || getComputedStyle(el).position === "absolute") continue;
    const cs = getComputedStyle(el);
    top = Math.min(top, el.offsetTop - parseFloat(cs.marginTop));
    bottom = Math.max(bottom, el.offsetTop + el.offsetHeight + parseFloat(cs.marginBottom));
  }
  return bottom > top ? bottom - top : 0;
}

function roomInside(screen) {
  const cs = getComputedStyle(screen);
  return screen.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
}

export function fitScreens() {
  const footer = document.querySelector(".site-footer");
  root.style.setProperty("--foot-h", (footer ? footer.offsetHeight : 0) + "px");

  const parts = [...document.querySelectorAll("[data-fit]")];
  for (const el of parts) el.style.zoom = "";
  const groups = new Map();
  for (const el of parts) {
    const screen = el.closest(".snap");
    if (!screen) continue;
    const over = contentHeight(screen) - roomInside(screen);
    const h = el.offsetHeight;
    const zoom = over > 0 && h > 0 ? Math.max(.4, (h - over) / h) : 1;
    const key = el.dataset.fit || el;
    groups.set(key, Math.min(groups.get(key) ?? 1, zoom));
  }
  for (const el of parts) {
    const zoom = groups.get(el.dataset.fit || el) ?? 1;
    if (zoom < 1) el.style.zoom = zoom.toFixed(3);
  }
}

let queued = 0;
const refit = () => { cancelAnimationFrame(queued); queued = requestAnimationFrame(fitScreens); };
fitScreens();
addEventListener("resize", refit);
addEventListener("load", fitScreens);
document.fonts?.ready.then(fitScreens);
