import { test } from "node:test";
import assert from "node:assert/strict";
import { submitSignup, SIGNUP_ENDPOINT, messageFor } from "../assets/signup.js";

/** A stand-in for fetch that records each call and answers with the given status (or throws). */
function fakeFetch(answer) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    if (answer instanceof Error) throw answer;
    return new Response(JSON.stringify(answer.body ?? {}), { status: answer.status });
  };
  return { impl, calls };
}

test("ok on 200", async () => {
  const { impl } = fakeFetch({ status: 200, body: { ok: true } });
  assert.equal(await submitSignup("sam@example.com", "", impl), "ok");
});

test("invalid on 400", async () => {
  const { impl } = fakeFetch({ status: 400, body: { error: "invalid_email" } });
  assert.equal(await submitSignup("not-an-email", "", impl), "invalid");
});

test("failed on a network error or a 500", async () => {
  assert.equal(await submitSignup("sam@example.com", "", fakeFetch(new TypeError("offline")).impl), "failed");
  assert.equal(await submitSignup("sam@example.com", "", fakeFetch({ status: 500 }).impl), "failed");
  assert.equal(await submitSignup("sam@example.com", "", fakeFetch({ status: 429 }).impl), "failed");
});

test("a 200 whose body is not ok is not counted as a sign-up", async () => {
  assert.equal(await submitSignup("sam@example.com", "", fakeFetch({ status: 200, body: {} }).impl), "failed");
});

test("sends exactly {email, website} as JSON to the endpoint", async () => {
  const { impl, calls } = fakeFetch({ status: 200, body: { ok: true } });
  await submitSignup("sam@example.com", "spam.example", impl);
  assert.equal(calls.length, 1);
  const { url, init } = calls[0];
  assert.equal(url, SIGNUP_ENDPOINT);
  assert.equal(SIGNUP_ENDPOINT, "https://siqmhaubpiplaooqhkgz.supabase.co/functions/v1/early-signup");
  assert.equal(init.method, "POST");
  assert.equal(new Headers(init.headers).get("content-type"), "application/json");
  assert.deepEqual(JSON.parse(init.body), { email: "sam@example.com", website: "spam.example" });
  assert.deepEqual(Object.keys(JSON.parse(init.body)).sort(), ["email", "website"]);
});

test("the visitor sees the agreed words for each result", () => {
  assert.equal(messageFor("ok"), "You're on the list!");
  assert.equal(messageFor("failed"), "Couldn't send — try again");
  assert.match(messageFor("invalid"), /email/i);
});
