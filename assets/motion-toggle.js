// A visible pause / resume control for the page's animation (WCAG 2.2.2).
// Pauses GSAP's global timeline once it has arrived (landing.js checks the class then), and every CSS animation through a class on <html>.
// People who asked their device for less motion already get a still page (motion.js, the "rm" class); the control still works for them.

const root = document.documentElement;
const button = document.createElement("button");
button.type = "button";
button.className = "motion-toggle";

function setPaused(paused) {
  root.classList.toggle("motion-paused", paused);
  if (window.gsap) {
    if (paused) gsap.globalTimeline.pause();
    else gsap.globalTimeline.resume();
  }
  button.setAttribute("aria-pressed", String(paused));
  // A small round icon; its name is spoken by screen readers and shown when a pointer rests on it.
  button.setAttribute("aria-label", paused ? "Play animation" : "Pause animation");
  button.title = button.getAttribute("aria-label");
  button.innerHTML = paused
    ? '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 2.5v11l9.5-5.5z" fill="currentColor"/></svg>'
    : '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor"/><rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor"/></svg>';
}

button.addEventListener("click", () => setPaused(!root.classList.contains("motion-paused")));
document.body.appendChild(button);
setPaused(false);
