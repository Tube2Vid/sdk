import type {
  JobEvent,
  JobStatus,
  JobSubmitInput,
  OperationalMetrics,
  PlatformHealthRow,
  PlatformSummary,
  PublicJobStatus,
  QueuedJobResponse,
  RecentDownload,
  StatusHistoryItem,
  UsageSummary
} from "./types.js";

export type Tube2VidClientOptions = {
  baseUrl?: string;
  apiKey?: string;
  fetch?: typeof fetch;
  headers?: Record<string, string>;
};

export class Tube2VidClient {
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly fetchImpl: typeof fetch;
  readonly headers: Record<string, string>;

  constructor(options: Tube2VidClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? defaultBaseUrl());
    this.apiKey = options.apiKey?.trim() || undefined;
    this.fetchImpl = options.fetch ?? fetch;
    this.headers = { ...(options.headers ?? {}) };
  }

  async listPlatforms(): Promise<PlatformSummary[]> {
    return this.getJson<PlatformSummary[]>("/v1/platforms");
  }

  async getPlatformHealth(): Promise<PlatformHealthRow[]> {
    return this.getJson<PlatformHealthRow[]>("/v1/platforms/health");
  }

  async getRecentDownloads(limit = 18): Promise<RecentDownload[]> {
    return this.getJson<RecentDownload[]>(`/v1/public/recent-downloads?limit=${encodeURIComponent(String(limit))}`);
  }

  async getPublicJobStatus(jobId: string): Promise<PublicJobStatus> {
    return this.getJson<PublicJobStatus>(`/v1/public/jobs/${encodeURIComponent(jobId)}`);
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    return this.getJson<JobStatus>(`/v1/jobs/${encodeURIComponent(jobId)}`);
  }

  async getJobEvents(jobId: string): Promise<JobEvent[]> {
    return this.getJson<JobEvent[]>(`/v1/jobs/${encodeURIComponent(jobId)}/events`);
  }

  async getStatusHistory(limit = 50): Promise<StatusHistoryItem[]> {
    return this.getJson<StatusHistoryItem[]>(`/v1/status/history?limit=${encodeURIComponent(String(limit))}`);
  }

  async getOperationalMetrics(): Promise<OperationalMetrics> {
    return this.getJson<OperationalMetrics>("/v1/ops/metrics");
  }

  async getUsage(): Promise<UsageSummary> {
    return this.getJson<UsageSummary>("/v1/usage");
  }

  async submitPublicJob(input: JobSubmitInput): Promise<QueuedJobResponse> {
    return this.postJson<QueuedJobResponse>("/v1/public/jobs", input);
  }

  async submitAuthenticatedJob(input: JobSubmitInput): Promise<QueuedJobResponse> {
    return this.postJson<QueuedJobResponse>("/v1/jobs", input);
  }

  async submitJob(input: JobSubmitInput): Promise<QueuedJobResponse> {
    return this.apiKey ? this.submitAuthenticatedJob(input) : this.submitPublicJob(input);
  }

  getDownloadUrl(jobId: string) {
    return new URL(`/v1/jobs/${encodeURIComponent(jobId)}/download`, this.baseUrl).toString();
  }

  private async getJson<T>(path: string): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      headers: this.authHeaders()
    });
    if (!response.ok) {
      throw await buildApiError(response);
    }
    return (await response.json()) as T;
  }

  private async postJson<T>(path: string, body: unknown): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        ...this.authHeaders(),
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw await buildApiError(response);
    }
    return (await response.json()) as T;
  }

  private authHeaders() {
    return this.apiKey ? { authorization: `Bearer ${this.apiKey}`, ...this.headers } : { ...this.headers };
  }
}

async function buildApiError(response: Response) {
  const text = await response.text().catch(() => "");
  const error = new Error(text || `Tube2Vid API request failed with ${response.status}`);
  (error as Error & { status?: number; body?: string }).status = response.status;
  (error as Error & { status?: number; body?: string }).body = text || undefined;
  return error;
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function defaultBaseUrl() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "http://localhost:8000";
}
