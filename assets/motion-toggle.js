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
  button.textContent = paused ? "Play animation" : "Pause animation";
}

button.addEventListener("click", () => setPaused(!root.classList.contains("motion-paused")));
document.body.appendChild(button);
setPaused(false);
