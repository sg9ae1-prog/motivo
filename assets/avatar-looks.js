// The looks the page shows before anyone restyles Motivo. The baker draws these ahead of time; the page draws them from that.

export const HERO = {
  skinTone: "light", eyes: "cute", eyebrows: "raised", mouth: "openSmile",
  hair: "short", hairColor: "black", facialHair: "none",
  clothing: "shirt", clothingColor: "green", accessory: "none", graphic: "none",
  hat: "none", hatColor: "blue", body: "chest", bgShape: "circle", bgColor: "turqoise",
  lipColor: "red", lashes: false,
};

// the small characters inside the phone screens
export const MINIS = {
  talk: { ...HERO, eyebrows: "raised", mouth: "open" },
  studio: { ...HERO, hair: "bun", hairColor: "brown", accessory: "roundGlasses", clothingColor: "pink", skinTone: "brown", eyes: "happy", mouth: "openSmile" },
};

export const FACES = {
  idle: { eyes: "cute", brows: "raised", mouth: "openSmile" },
  worried: { eyes: "cute", brows: "concerned", mouth: "sad" },
  hello: { eyes: "cute", brows: "raised", mouth: "openSmile" },
  curious: { eyes: "cute", brows: "raised", mouth: "grin" },
  party: { eyes: "happy", brows: "raised", mouth: "open" },
  talk: { eyes: "cute", brows: "raised", mouth: "open" },
  wink: { eyes: "wink", brows: "raised", mouth: "openSmile" },
  supportive: { eyes: "happy", brows: "raised", mouth: "openSmile" },
  understanding: { eyes: "cute", brows: "concerned", mouth: "grin" },
  leader: { eyes: "cute", brows: "serious", mouth: "openSmile" },
};

// A drawing is named by everything that changes it, so a restyled look never picks up a stale drawing.
export const renderKey = (look, size) => JSON.stringify([size, ...Object.keys(look).sort().map((k) => [k, look[k]])]);
export const partKey = (kind, name, look) => [kind, name, look.skinTone, kind === "mouth" ? look.lipColor : ""].join(":");
