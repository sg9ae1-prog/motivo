// Keyboard paging: each press of a paging key moves exactly one snapped screen. Held keys repeat only once the
// page has come to rest, so a held arrow steps screen by screen instead of fighting the snap. Wheel and touch stay native.

const FORWARD = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 };
const TYPING = new Set(["INPUT", "TEXTAREA", "SELECT"]);
const PRESSABLE = new Set(["BUTTON", "A", "SUMMARY"]); // Space presses these

/** Which way a key pages: 1 down, -1 up, 0 when the key is not ours (other keys, modifiers, typing in a field). */
export function stepFor(e) {
  if (e.altKey || e.ctrlKey || e.metaKey || TYPING.has(e.target?.tagName) || e.target?.isContentEditable) return 0;
  if (e.key === " ") return PRESSABLE.has(e.target?.tagName) ? 0 : e.shiftKey ? -1 : 1;
  return FORWARD[e.key] ?? 0;
}

/** Where one step from `y` lands: the nearest screen start that way, but never more than a window away.
 *  Null past the first or last screen, where the browser's own scrolling takes over. */
export function nextScreenTop(tops, y, windowHeight, dir) {
  const ahead = dir > 0 ? tops.filter((t) => t > y + 1) : tops.filter((t) => t < y - 1).reverse();
  if (!ahead.length) return null;
  const limit = y + dir * windowHeight;
  return dir > 0 ? Math.min(ahead[0], limit) : Math.max(ahead[0], limit);
}

if (typeof document !== "undefined") {
  const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  let moving = false, settleTimer;
  const settle = () => { clearTimeout(settleTimer); moving = false; };

  addEventListener("keydown", (e) => {
    const dir = stepFor(e);
    if (!dir) return;
    const tops = [...document.querySelectorAll(".snap")].map((s) => Math.round(s.getBoundingClientRect().top + scrollY));
    const to = nextScreenTop(tops, scrollY, innerHeight, dir);
    if (to === null) return;
    e.preventDefault();
    if (moving) return;
    moving = true;
    scrollTo({ top: to, behavior: smooth ? "smooth" : "auto" });
    settleTimer = setTimeout(settle, 900); // Safari before 18 has no scrollend
  });
  addEventListener("scrollend", settle);
}
