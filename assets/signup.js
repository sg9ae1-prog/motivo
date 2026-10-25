// The early sign-up: sends one email address to the sign-up list and says how it went.
// Talks to the endpoint and wires a form to it; knows nothing about the character.

export const SIGNUP_ENDPOINT = "https://siqmhaubpiplaooqhkgz.supabase.co/functions/v1/early-signup";
const TIMEOUT_MS = 12000;
/** Which wording sits under the email field, and which privacy policy it links to. Change both when either text changes. */
export const CONSENT_VERSION = "2026-10-25.1";
export const POLICY_VERSION = "2026-10-25";

/**
 * Send one sign-up. `website` is the hidden field a person never fills.
 * @returns {Promise<"ok" | "invalid" | "failed">}
 */
export async function submitSignup(email, website, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(SIGNUP_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, website, consent_version: CONSENT_VERSION, policy_version: POLICY_VERSION }),
      signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(TIMEOUT_MS) : undefined,
    });
    if (res.status === 400) return "invalid";
    if (!res.ok) return "failed";
    const body = await res.json().catch(() => null);
    return body && body.ok === true ? "ok" : "failed";
  } catch {
    return "failed";
  }
}

/** What the visitor reads under the form for each result. */
export function messageFor(result) {
  return {
    ok: "You're on the list!",
    invalid: "That email doesn't look right. Check it and try again.",
    failed: "Couldn't send — try again",
  }[result];
}

/**
 * Wire a sign-up form: an email input, a hidden `website` input, a submit button and an
 * element with [data-status]. On success every form in `group` shows the thank-you, but only
 * the submitted form announces it and takes focus; on failure the typed email stays in the field.
 * `onSignedUp` is a courtesy hook: if it throws, the sign-up still shows as done.
 */
export function attachSignupForm(form, { group = [form], onSignedUp = () => {}, fetchImpl } = {}) {
  const email = form.querySelector('input[type="email"]');
  const website = form.querySelector('input[name="website"]');
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector("[data-status]");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.dataset.state === "sending") return;
    form.dataset.state = "sending";
    button.disabled = true;
    status.textContent = "";
    const result = await submitSignup(email.value.trim(), website.value, fetchImpl);
    button.disabled = false;
    if (result === "ok") {
      for (const f of group) {
        const s = f.querySelector("[data-status]");
        if (f !== form) s.setAttribute("aria-live", "off"); // one announcement, from the form the visitor used
        f.dataset.state = "done";
        s.textContent = messageFor("ok");
      }
      status.setAttribute("tabindex", "-1");
      status.focus();
      try { onSignedUp(); } catch { /* the reaction is decoration; the sign-up already succeeded */ }
    } else {
      form.dataset.state = result;
      status.textContent = messageFor(result);
      email.focus();
    }
  });
}
