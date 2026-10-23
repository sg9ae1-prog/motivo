// Wires every early sign-up form on the page. Loads on its own, so the sign-up works even when the
// character, its animation libraries or the CDN fail. It announces each sign-up as a page event,
// which the character may (or may not) be listening for.
import { attachSignupForm } from "./signup.js";

export const SIGNED_UP_EVENT = "motivo:signedup";

export function wireSignupForms(root, { fetchImpl } = {}) {
  const forms = [...root.querySelectorAll("[data-signup]")];
  for (const form of forms) {
    attachSignupForm(form, { group: forms, fetchImpl, onSignedUp: () => root.dispatchEvent(new CustomEvent(SIGNED_UP_EVENT)) });
  }
}

if (typeof document !== "undefined") wireSignupForms(document);
