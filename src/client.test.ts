import assert from "node:assert/strict";
import { test } from "node:test";
import { Tube2VidApiError, Tube2VidClient } from "./client.js";

type Call = { url: string; init?: RequestInit };

function fakeFetch(responses: Response[]) {
  const calls: Call[] = [];
  const impl = (async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const next = responses.shift();
    if (!next) throw new Error(`unexpected request ${url}`);
    return next;
  }) as typeof fetch;
  return { calls, impl };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

test("sends the API key and parses API errors", async () => {
  const { calls, impl } = fakeFetch([json({ error: "Insufficient credits", code: "no_credits" }, 402)]);
  const client = new Tube2VidClient({ baseUrl: "https://example.test/", apiKey: "tv_live_x", fetch: impl });
  const error = await client.submitJob({ url: "https://youtu.be/x" }).catch((caught: unknown) => caught);
  assert.ok(error instanceof Tube2VidApiError);
  assert.equal(error.status, 402);
  assert.equal(error.message, "Insufficient credits");
  assert.equal(error.code, "no_credits");
  assert.equal(calls[0]?.url, "https://example.test/v1/jobs");
  assert.equal((calls[0]?.init?.headers as Record<string, string>).authorization, "Bearer tv_live_x");
});

test("without a key, submitJob uses the public route", async () => {
  const { calls, impl } = fakeFetch([json({ jobId: "j", status: "queued", platform: "youtube", estimatedCredits: 0 })]);
  await new Tube2VidClient({ baseUrl: "https://example.test", fetch: impl }).submitJob({ url: "https://youtu.be/x" });
  assert.equal(calls[0]?.url, "https://example.test/v1/public/jobs");
  assert.equal((calls[0]?.init?.headers as Record<string, string>).authorization, undefined);
});

test("downloadJob follows the signed redirect without the API key", async () => {
  const { calls, impl } = fakeFetch([
    new Response(null, { status: 302, headers: { location: "https://cdn.test/file.mp4?sig=1" } }),
    new Response("bytes")
  ]);
  const client = new Tube2VidClient({ baseUrl: "https://example.test", apiKey: "tv_live_x", fetch: impl });
  const file = await client.downloadJob("job 1");
  assert.equal(await file.text(), "bytes");
  assert.equal(calls[0]?.url, "https://example.test/v1/jobs/job%201/download");
  assert.equal(calls[1]?.url, "https://cdn.test/file.mp4?sig=1");
  assert.equal(calls[1]?.init, undefined);
});

test("waitForJob polls until a terminal state", async () => {
  const job = (status: string) => json({ id: "j", status, progress: 0 });
  const { calls, impl } = fakeFetch([job("queued"), job("running"), job("completed")]);
  const client = new Tube2VidClient({ baseUrl: "https://example.test", apiKey: "tv_live_x", fetch: impl });
  const final = await client.waitForJob("j", { intervalMs: 1 });
  assert.equal(final.status, "completed");
  assert.equal(calls.length, 3);
});

test("reads the API key from TUBE2VID_API_KEY when none is passed", () => {
  const previous = process.env.TUBE2VID_API_KEY;
  process.env.TUBE2VID_API_KEY = "tv_live_env";
  try {
    assert.equal(new Tube2VidClient().apiKey, "tv_live_env");
    assert.equal(new Tube2VidClient({ apiKey: "tv_live_arg" }).apiKey, "tv_live_arg");
  } finally {
    if (previous === undefined) delete process.env.TUBE2VID_API_KEY;
    else process.env.TUBE2VID_API_KEY = previous;
  }
});
