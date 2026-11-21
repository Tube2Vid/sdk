// Response and request shapes of the public Tube2Vid API (/v1/*). Kept in sync with openapi/openapi.yaml.

export type JobMode = "auto" | "video" | "audio" | "gallery";
export type JobState = "queued" | "running" | "completed" | "failed";
export type PlatformStatusValue = "operational" | "degraded" | "partial_outage" | "down" | "beta";

export type JobSubmitInput = {
  url: string;
  /** Force a platform slug instead of detecting it from the URL. */
  platform?: string;
  mode?: JobMode;
  format?: string;
  quality?: string;
  /** Browser flow only: an Atlas captcha token (`atlas1.…`) for action "download". Not needed with an API key. */
  captchaToken?: string;
};

export type QueuedJobResponse = {
  jobId: string;
  /** "queued" for a new job; a deduplicated public submission returns the existing job's state. */
  status: JobState;
  platform: string;
  estimatedCredits: number;
  /** True when a public submission was folded into an identical job from the last minute. */
  deduped?: boolean;
};

export type PlatformSummary = {
  slug: string;
  name: string;
  category: string;
  supportLevel: string;
  publicClaim: boolean;
  capabilities: string[];
  providers: Array<{
    id: string;
    kind: string;
    priority: number;
  }>;
};

export type PlatformHealthRow = {
  platform: string;
  name: string;
  category: string;
  supportLevel: string;
  status: PlatformStatusValue;
  auditCategory: string;
  provider?: string;
  providerKind?: string;
  successRate?: number;
  medianExtractMs?: number;
  lastCheckedAt?: string;
  note?: string;
  reason?: string;
  authNeeded?: boolean;
  repaired?: boolean;
};

export type JobEvent = {
  id: string;
  jobId: string;
  stage: string;
  message: string;
  details?: Record<string, unknown> | null;
  createdAt: string;
};

export type PublicJobStatus = {
  jobId: string;
  platform: string;
  status: JobState;
  progress: number;
  provider?: string;
  /** True when the file came from a reduced-quality last-resort provider. */
  fallback?: boolean;
  title?: string;
  errorCode?: string;
  errorMessage?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  latestEvent?: {
    stage: string;
    message?: string;
    details?: Record<string, unknown> | null;
    createdAt: string;
  };
};

export type JobStatus = {
  id: string;
  jobId?: string;
  userId?: string;
  apiKeyId?: string;
  url: string;
  platform: string;
  mode: JobMode;
  format: string;
  quality: string;
  creditsReserved: number;
  status: JobState;
  progress: number;
  creditsCharged: number;
  provider?: string;
  title?: string;
  outputPath?: string;
  outputStorageKey?: string;
  outputSize?: number;
  thumbnailUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type UsageSummary = {
  creditBalance: number;
  jobsTotal: number;
  jobsCompleted: number;
  jobsFailed: number;
};

export type StatusHistoryItem = {
  id: string;
  platform: string;
  provider: string;
  status: string;
  durationMs?: number;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
};

export type OperationalMetrics = {
  generatedAt: string;
  queueDepth: number;
  queuedJobs: number;
  runningJobs: number;
  completedJobs24h: number;
  failedJobs24h: number;
  p95JobDurationMs?: number;
  providerFailureRates: Array<{
    provider: string;
    total: number;
    failed: number;
    failureRate: number;
  }>;
  alerts: Array<{
    level: "info" | "warn" | "critical";
    code: string;
    message: string;
  }>;
};

export type ServiceHealth = {
  ok: boolean;
  service: string;
  time: string;
};

export type ApiKeyScope = "jobs:write" | "jobs:read" | "usage:read" | "keys:read" | "keys:write" | "billing:write";

export type ApiKeyCreateInput = {
  name: string;
  /** Defaults to ["jobs:write", "jobs:read", "usage:read"]. */
  scopes?: ApiKeyScope[];
  /** 1-1000, defaults to 60. */
  rateLimitPerMinute?: number;
};

export type CreatedApiKey = {
  id: string;
  name: string;
  /** The plaintext key. It is only ever returned once. */
  key: string;
  prefix: string;
  scopes: string[];
};

export type ApiKeySummary = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  rateLimitPerMinute: number;
  revokedAt?: string;
  createdAt: string;
};

export type CheckoutInput = {
  /** 1,000-250,000 credits. */
  credits?: number;
  /** Legacy fixed packs. */
  pack?: "starter" | "builder" | "scale";
};

export type CheckoutSession = {
  checkoutUrl: string | null;
  mode: "stripe" | "placeholder";
  sessionId?: string;
  credits: number;
  amountCents: number;
  message?: string;
};
