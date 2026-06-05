# Tube2Vid SDK

Typed JavaScript/TypeScript client for the Tube2Vid API.

## Install

```bash
npm install @tube2vid/sdk
```

## Usage

```ts
import { Tube2VidClient } from "@tube2vid/sdk";

const client = new Tube2VidClient({
  baseUrl: "https://api.tube2vid.com",
  apiKey: process.env.TUBE2VID_API_KEY
});

const job = await client.submitJob({
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  mode: "auto",
  format: "mp4",
  quality: "best"
});

console.log(job.jobId);
```
