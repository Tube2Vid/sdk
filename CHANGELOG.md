# Changelog

## 1.1.0 (2026-11-21)

- The client reads the API key from `TUBE2VID_API_KEY` when no `apiKey` is passed (Node, Deno, Bun).
- `baseUrl` defaults to `https://tube2vid.com` (exported as `DEFAULT_BASE_URL`).
- New methods: `getHealth`, `getPowChallenge`, `downloadJob`, `getDownloadLink`, `waitForJob`, `listApiKeys`, `createApiKey`, `createCheckout`.
- Non-2xx responses throw a typed `Tube2VidApiError` with `status`, `message`, `code`, `body` and the parsed `data`.
- Unit tests, CI on Node 20, 22 and 24, and npm releases with provenance.

## 1.0.0

- First standalone release.
