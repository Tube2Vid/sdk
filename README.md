# Tube2Vid TypeScript SDK

[![CI](https://github.com/Tube2Vid/sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/Tube2Vid/sdk/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@tube2vid/sdk.svg)](https://www.npmjs.com/package/@tube2vid/sdk)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

The official YouTube, TikTok and Instagram video downloader API client for TypeScript and JavaScript. `@tube2vid/sdk` is a typed, zero-dependency wrapper around the [Tube2Vid media download API](https://tube2vid.com): submit a URL from YouTube, TikTok, Instagram, X, Reddit or any of 1,800+ other sites, and get back an MP4, MP3 or image file. It runs in Node, Deno, Bun and the browser.

## Install

```bash
npm install @tube2vid/sdk
```

Needs Node 18.17+ (or any runtime with `fetch`). [Get an API key](https://tube2vid.com/pricing) and export it as `TUBE2VID_API_KEY`; the client reads it automatically.

## Quickstart

```ts
import { writeFile } from "node:fs/promises";
import { Tube2VidClient } from "@tube2vid/sdk";

const client = new Tube2VidClient({ apiKey: process.env.TUBE2VID_API_KEY });

const queued = await client.submitJob({
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  mode: "auto", // "auto" | "video" | "audio" | "gallery"
  format: "mp4",
  quality: "best"
});

const job = await client.waitForJob(queued.jobId);
if (job.status === "failed") throw new Error(job.errorMessage);

const file = await client.downloadJob(job.id);
await writeFile(`${job.id}.${job.format}`, Buffer.from(await file.arrayBuffer()));

// Or hand someone a short-lived direct link instead:
console.log(await client.getDownloadLink(job.id));
```

## Configuration

| Option | Default | |
| --- | --- | --- |
| `apiKey` | `$TUBE2VID_API_KEY` | Your `tv_live_...` key, sent as `Authorization: Bearer` |
| `baseUrl` | `https://tube2vid.com` (the page origin in a browser) | API origin |
| `fetch` | global `fetch` | Custom fetch, e.g. for proxies or tests |
| `headers` | none | Extra headers on every request |

## Methods

Public, no key needed:

| Method | Endpoint |
| --- | --- |
| `getHealth()` | `GET /healthz` |
| `listPlatforms()` | `GET /v1/platforms` |
| `getPlatformHealth()` | `GET /v1/platforms/health` |
| `getStatusHistory(limit?, platform?)` | `GET /v1/status/history` |
| `getOperationalMetrics()` | `GET /v1/ops/metrics` |
| `submitPublicJob(input)` | `POST /v1/public/jobs` (browser flow: needs an Atlas `captchaToken`) |
| `getPublicJobStatus(jobId)` | `GET /v1/public/jobs/{jobId}` |
| `getPublicDownloadUrl(jobId)`, `getPublicThumbnailUrl(jobId)` | URL builders |

With an API key:

| Method | Endpoint | Scope |
| --- | --- | --- |
| `submitJob(input)` / `submitAuthenticatedJob(input)` | `POST /v1/jobs` | `jobs:write` |
| `getJobStatus(jobId)`, `waitForJob(jobId, options?)` | `GET /v1/jobs/{jobId}` | `jobs:read` |
| `getJobEvents(jobId)` | `GET /v1/jobs/{jobId}/events` | `jobs:read` |
| `downloadJob(jobId)`, `getDownloadLink(jobId)` | `GET /v1/jobs/{jobId}/download` | `jobs:read` |
| `getUsage()` | `GET /v1/usage` | `usage:read` |
| `listApiKeys()` | `GET /v1/api-keys` | `keys:read` |
| `createApiKey(input)` | `POST /v1/api-keys` | `keys:write` |
| `createCheckout({ credits })` | `POST /v1/billing/checkout` | `billing:write` |

`getDownloadLink` and `downloadJob` read the API's redirect to the signed file URL, so they work in server runtimes (Node, Deno, Bun), not in browsers.

## Errors

Any non-2xx response throws a `Tube2VidApiError` with `status`, `message`, `code` (when the API sends one, e.g. `captcha_failed`), the raw `body`, and the parsed `data`. A `402` means the account is out of credits; `data.requiredCredits` says how many the job needs.

```ts
import { Tube2VidApiError } from "@tube2vid/sdk";

try {
  await client.getUsage();
} catch (error) {
  if (error instanceof Tube2VidApiError && error.status === 401) console.error("Check your API key");
  else throw error;
}
```


## Links

- [Tube2Vid](https://tube2vid.com): the online video downloader this SDK talks to
- [API documentation](https://tube2vid.com/docs) and the [OpenAPI spec](https://github.com/Tube2Vid/api)
- [Pricing and API keys](https://tube2vid.com/pricing)
- [Live platform status](https://tube2vid.com/status) for YouTube, TikTok, Instagram and the rest
- Tools built on this SDK: the [`tube2vid` CLI](https://github.com/Tube2Vid/cli) and the [Tube2Vid MCP server](https://github.com/Tube2Vid/mcp) for Claude and Cursor

Other languages: [TypeScript](https://github.com/Tube2Vid/sdk), [Python](https://github.com/Tube2Vid/sdk-python), [Go](https://github.com/Tube2Vid/sdk-go), [Java](https://github.com/Tube2Vid/sdk-java), [C#](https://github.com/Tube2Vid/sdk-dotnet), [PHP](https://github.com/Tube2Vid/sdk-php), [Ruby](https://github.com/Tube2Vid/sdk-ruby), [Rust](https://github.com/Tube2Vid/sdk-rust), [Swift](https://github.com/Tube2Vid/sdk-swift).

## Develop

```bash
npm install
npm test
npm run build
```

## License

[MIT](LICENSE), Copyright (c) 2026 Tube2Vid.
