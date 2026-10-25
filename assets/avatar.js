// Draws Motivo. Ready-made drawings cover the page as it first appears; the drawing library loads when restyling is near (see ready()).
import { BAKED } from "./avatar-baked.js";
import { renderKey, partKey } from "./avatar-looks.js";

const LIBRARY = new URL("./bigheads.js", import.meta.url).href;
let loading = null;

/** Loads the drawing library once; resolves when any look can be drawn. */
export function ready() {
  if (globalThis.Motivo) return Promise.resolve();
  return (loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = LIBRARY; s.onload = () => resolve(); s.onerror = () => { loading = null; reject(new Error("the drawing library did not load")); };
    document.head.append(s);
  }));
}

function draw(baked, viaLibrary) {
  if (baked !== undefined) return baked;
  if (!globalThis.Motivo) throw new Error("this look needs the drawing library: await ready() first");
  return viaLibrary(globalThis.Motivo);
}

export const render = (look, size = 1000) => draw(BAKED.renders[renderKey(look, size)], (M) => M.render(look, size));
export const part = (kind, name, look) => draw(BAKED.parts[partKey(kind, name, look)], (M) => M.part(kind, name, look));
export const colors = BAKED.colors;
