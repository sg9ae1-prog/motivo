import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { attachSignupForm } from "../assets/signup.js";
import { wireSignupForms } from "../assets/signup-init.js";
import { readPage } from "./pages.mjs";

// A minimal stand-in for the page: just what a sign-up form touches. No DOM library needed.
function fakePage(formCount = 2) {
  const page = { active: null, events: [] };
  const el = (extra = {}) => {
    const attrs = {};
    return {
      dataset: {}, textContent: "", disabled: false, value: "",
      setAttribute(k, v) { attrs[k] = String(v); }, getAttribute(k) { return attrs[k] ?? null; },
      focus() { page.active = this; },
      ...extra,
    };
  };
  const makeForm = () => {
    const parts = {
      'input[type="email"]': el(), 'input[name="website"]': el(),
      'button[type="submit"]': el(), "[data-status]": el(),
    };
    parts["[data-status]"].setAttribute("aria-live", "polite");
    const listeners = {};
    const form = el({
      parts,
      querySelector: (sel) => parts[sel] ?? null,
      addEventListener: (type, fn) => { (listeners[type] ??= []).push(fn); },
      submit: () => Promise.all((listeners.submit ?? []).map((fn) => fn({ preventDefault() {} }))),
    });
    return form;
  };
  page.forms = Array.from({ length: formCount }, makeForm);
  page.root = {
    querySelectorAll: (sel) => (sel === "[data-signup]" ? page.forms : []),
    dispatchEvent: (e) => { page.events.push(e.type); return true; },
  };
  return page;
}

/** A fetch that answers when told to, so a second submit can arrive while the first is in flight. */
function heldFetch(status, body) {
  const calls = [];
  let release;
  const gate = new Promise((r) => { release = r; });
  const impl = async (url, init) => { calls.push(init.body); await gate; return new Response(JSON.stringify(body), { status }); };
  return { impl, calls, release };
}

test("a double submit sends one request", async () => {
  const page = fakePage(1);
  const [form] = page.forms;
  const f = heldFetch(200, { ok: true });
  attachSignupForm(form, { fetchImpl: f.impl });
  form.parts['input[type="email"]'].value = "sam@example.com";
  const first = form.submit(), second = form.submit();
  f.release();
  await Promise.all([first, second]);
  assert.equal(f.calls.length, 1);
});

test("a failure keeps the typed email, says so, and puts the cursor back in the field", async () => {
  const page = fakePage(1);
  const [form] = page.forms;
  const f = heldFetch(500, {});
  f.release();
  attachSignupForm(form, { fetchImpl: f.impl });
  form.parts['input[type="email"]'].value = "sam@example.com";
  await form.submit();
  assert.equal(form.dataset.state, "failed");
  assert.equal(form.parts["[data-status]"].textContent, "Couldn't send — try again");
  assert.equal(form.parts['input[type="email"]'].value, "sam@example.com");
  assert.equal(page.active, form.parts['input[type="email"]']);
  assert.equal(form.parts['button[type="submit"]'].disabled, false);
});

test("success marks every form done, focuses the submitted form's status, and only that form announces", async () => {
  const page = fakePage(2);
  const [hero, end] = page.forms;
  const f = heldFetch(200, { ok: true });
  f.release();
  attachSignupForm(end, { group: page.forms, fetchImpl: f.impl });
  end.parts['input[type="email"]'].value = "sam@example.com";
  await end.submit();
  assert.deepEqual(page.forms.map((x) => x.dataset.state), ["done", "done"]);
  assert.equal(page.active, end.parts["[data-status]"], "focus moves to the thank-you");
  assert.equal(end.parts["[data-status]"].getAttribute("tabindex"), "-1");
  assert.equal(end.parts["[data-status]"].getAttribute("aria-live"), "polite");
  assert.equal(hero.parts["[data-status]"].getAttribute("aria-live"), "off", "the other form updates silently");
});

test("a broken character reaction never breaks the sign-up", async () => {
  const page = fakePage(1);
  const [form] = page.forms;
  const f = heldFetch(200, { ok: true });
  f.release();
  attachSignupForm(form, { fetchImpl: f.impl, onSignedUp: () => { throw new Error("character failed to load"); } });
  form.parts['input[type="email"]'].value = "sam@example.com";
  await form.submit();
  assert.equal(form.dataset.state, "done");
});

test("the forms are wired on their own, without the character script, and tell the page when someone signs up", async () => {
  const page = fakePage(2);
  const f = heldFetch(200, { ok: true });
  f.release();
  wireSignupForms(page.root, { fetchImpl: f.impl });
  page.forms[0].parts['input[type="email"]'].value = "sam@example.com";
  await page.forms[0].submit();
  assert.equal(f.calls.length, 1);
  assert.deepEqual(page.forms.map((x) => x.dataset.state), ["done", "done"]);
  assert.deepEqual(page.events, ["motivo:signedup"]);
});

test("the sign-up loads independently of the character and its libraries", () => {
  const html = readPage("index.html");
  assert.match(html, /<script type="module" src="assets\/signup-init\.js"><\/script>/);
  const init = readFileSync(new URL("../assets/signup-init.js", import.meta.url), "utf8");
  const imports = [...init.matchAll(/import[^"']*["']([^"']+)["']/g)].map((m) => m[1]);
  assert.deepEqual(imports, ["./signup.js"]);
  const landing = readFileSync(new URL("../assets/landing.js", import.meta.url), "utf8");
  assert.doesNotMatch(landing, /signup\.js|attachSignupForm/, "the character script never wires the forms");
});

test("every sign-up form posts, so an email can never land in a URL", () => {
  const forms = readPage("index.html").match(/<form[^>]*>/gi) ?? [];
  assert.ok(forms.length >= 1, "the Get Motivo form");
  for (const f of forms) assert.match(f, /method="post"/);
});
