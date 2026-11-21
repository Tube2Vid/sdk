import type {
  ApiKeyCreateInput,
  ApiKeySummary,
  CheckoutInput,
  CheckoutSession,
  CreatedApiKey,
  JobEvent,
  JobStatus,
  JobSubmitInput,
  OperationalMetrics,
  PlatformHealthRow,
  PlatformSummary,
  PublicJobStatus,
  QueuedJobResponse,
  ServiceHealth,
  StatusHistoryItem,
  UsageSummary
} from "./types.js";

export const DEFAULT_BASE_URL = "https://tube2vid.com";

export type Tube2VidClientOptions = {
  /** API origin. Defaults to the page origin in a browser, otherwise https://tube2vid.com. */
  baseUrl?: string;
  /** A `tv_live_...` API key. Defaults to `$TUBE2VID_API_KEY` in Node, Deno and Bun. Required for /v1/jobs, /v1/usage, /v1/api-keys and billing. */
  apiKey?: string;
  fetch?: typeof fetch;
  headers?: Record<string, string>;
};

export type WaitForJobOptions = {
  /** Poll interval, default 2000 ms. */
  intervalMs?: number;
  /** Give up after this long, default 15 minutes. */
  timeoutMs?: number;
  onUpdate?: (job: JobStatus) => void;
  signal?: AbortSignal;
};

/** Thrown for any non-2xx API response. */
export class Tube2VidApiError extends Error {
  readonly status: number;
  /** Raw response body, if any. */
  readonly body?: string;
  /** Machine-readable error code when the API sent one (e.g. "captcha_failed"). */
  readonly code?: string;
  /** Parsed JSON body, if the body was JSON. */
  readonly data?: unknown;

  constructor(status: number, body?: string) {
    let data: unknown;
    try {
      data = body ? JSON.parse(body) : undefined;
    } catch {
      data = undefined;
    }
    const fields = (data && typeof data === "object" ? data : {}) as { error?: unknown; code?: unknown };
    super(typeof fields.error === "string" ? fields.error : body || `Tube2Vid API request failed with ${status}`);
    this.name = "Tube2VidApiError";
    this.status = status;
    this.body = body || undefined;
    this.code = typeof fields.code === "string" ? fields.code : undefined;
    this.data = data;
  }
}

export class Tube2VidClient {
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly fetchImpl: typeof fetch;
  readonly headers: Record<string, string>;

  constructor(options: Tube2VidClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? defaultBaseUrl());
    this.apiKey = (options.apiKey ?? envApiKey())?.trim() || undefined;
    this.fetchImpl = options.fetch ?? ((...args) => fetch(...args));
    this.headers = { ...(options.headers ?? {}) };
  }

  // Public, no API key needed.

  async getHealth(): Promise<ServiceHealth> {
    return this.getJson<ServiceHealth>("/healthz");
  }

  async listPlatforms(): Promise<PlatformSummary[]> {
    return this.getJson<PlatformSummary[]>("/v1/platforms");
  }

  async getPlatformHealth(): Promise<PlatformHealthRow[]> {
    return this.getJson<PlatformHealthRow[]>("/v1/platforms/health");
  }


  async getStatusHistory(limit = 50, platform?: string): Promise<StatusHistoryItem[]> {
    const query = new URLSearchParams({ limit: String(limit) });
    if (platform) query.set("platform", platform);
    return this.getJson<StatusHistoryItem[]>(`/v1/status/history?${query}`);
  }

  async getOperationalMetrics(): Promise<OperationalMetrics> {
    return this.getJson<OperationalMetrics>("/v1/ops/metrics");
  }

  /** Anonymous submission, as the website does it. Requires a solved Atlas `captchaToken`; scripts should use submitJob with an API key. */
  async submitPublicJob(input: JobSubmitInput): Promise<QueuedJobResponse> {
    return this.postJson<QueuedJobResponse>("/v1/public/jobs", input);
  }

  async getPublicJobStatus(jobId: string): Promise<PublicJobStatus> {
    return this.getJson<PublicJobStatus>(`/v1/public/jobs/${encodeURIComponent(jobId)}`);
  }

  /** Direct link to an anonymous job's file; it redirects to a short-lived signed URL. */
  getPublicDownloadUrl(jobId: string) {
    return `${this.baseUrl}/v1/public/jobs/${encodeURIComponent(jobId)}/download`;
  }

  getPublicThumbnailUrl(jobId: string) {
    return `${this.baseUrl}/v1/public/jobs/${encodeURIComponent(jobId)}/thumbnail`;
  }

  // Authenticated, needs an API key (or a browser session token).

  async submitAuthenticatedJob(input: JobSubmitInput): Promise<QueuedJobResponse> {
    return this.postJson<QueuedJobResponse>("/v1/jobs", input);
  }

  /** Uses /v1/jobs with an API key, /v1/public/jobs without one. */
  async submitJob(input: JobSubmitInput): Promise<QueuedJobResponse> {
    return this.apiKey ? this.submitAuthenticatedJob(input) : this.submitPublicJob(input);
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    return this.getJson<JobStatus>(`/v1/jobs/${encodeURIComponent(jobId)}`);
  }

  async getJobEvents(jobId: string): Promise<JobEvent[]> {
    return this.getJson<JobEvent[]>(`/v1/jobs/${encodeURIComponent(jobId)}/events`);
  }

  /** Polls getJobStatus until the job is completed or failed. Resolves with the final job either way. */
  async waitForJob(jobId: string, options: WaitForJobOptions = {}): Promise<JobStatus> {
    const intervalMs = options.intervalMs ?? 2000;
    const deadline = Date.now() + (options.timeoutMs ?? 15 * 60 * 1000);
    for (;;) {
      options.signal?.throwIfAborted();
      const job = await this.getJobStatus(jobId);
      options.onUpdate?.(job);
      if (job.status === "completed" || job.status === "failed") return job;
      if (Date.now() + intervalMs > deadline) throw new Error(`Timed out waiting for job ${jobId}`);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  /** The authenticated download endpoint. It needs the bearer header, so prefer getDownloadLink or downloadJob. */
  getDownloadUrl(jobId: string) {
    return `${this.baseUrl}/v1/jobs/${encodeURIComponent(jobId)}/download`;
  }

  /**
   * Resolves a completed job to its short-lived signed file URL, which needs no auth.
   * shortcut: relies on reading the redirect, which only server runtimes (Node, Deno, Bun) allow; browsers get an error.
   */
  async getDownloadLink(jobId: string): Promise<string> {
    const response = await this.send(this.getDownloadUrl(jobId), { redirect: "manual" });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) return new URL(location, this.baseUrl).toString();
    await response.body?.cancel();
    if (!response.ok) throw await toApiError(response);
    throw new Tube2VidApiError(response.status, "This API serves the file directly; use downloadJob instead.");
  }

  /** Fetches a completed job's file. Read the body as a stream or with arrayBuffer(). */
  async downloadJob(jobId: string): Promise<Response> {
    const response = await this.send(this.getDownloadUrl(jobId), { redirect: "manual" });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      // The signed URL carries its own auth; the API key must not be sent to the storage host.
      const file = await this.fetchImpl(new URL(location, this.baseUrl).toString());
      if (!file.ok) throw await toApiError(file);
      return file;
    }
    if (!response.ok) throw await toApiError(response);
    return response;
  }

  async getUsage(): Promise<UsageSummary> {
    return this.getJson<UsageSummary>("/v1/usage");
  }

  /** Needs the keys:read scope. */
  async listApiKeys(): Promise<ApiKeySummary[]> {
    return this.getJson<ApiKeySummary[]>("/v1/api-keys");
  }

  /** Needs the keys:write scope. The returned `key` is shown only once. */
  async createApiKey(input: ApiKeyCreateInput): Promise<CreatedApiKey> {
    return this.postJson<CreatedApiKey>("/v1/api-keys", input);
  }

  /** Needs the billing:write scope. Open `checkoutUrl` to pay. */
  async createCheckout(input: CheckoutInput): Promise<CheckoutSession> {
    return this.postJson<CheckoutSession>("/v1/billing/checkout", input);
  }

  private async getJson<T>(path: string): Promise<T> {
    const response = await this.send(`${this.baseUrl}${path}`, {});
    if (!response.ok) throw await toApiError(response);
    return (await response.json()) as T;
  }

  private async postJson<T>(path: string, body: unknown): Promise<T> {
    const response = await this.send(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw await toApiError(response);
    return (await response.json()) as T;
  }

  private send(url: string, init: RequestInit) {
    return this.fetchImpl(url, {
      ...init,
      headers: {
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        ...this.headers,
        ...(init.headers as Record<string, string> | undefined)
      }
    });
  }
}

async function toApiError(response: Response) {
  return new Tube2VidApiError(response.status, await response.text().catch(() => ""));
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function defaultBaseUrl() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return DEFAULT_BASE_URL;
}

// No @types/node here: the SDK also runs in browsers, where `process` does not exist.
function envApiKey(): string | undefined {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.TUBE2VID_API_KEY;
}
