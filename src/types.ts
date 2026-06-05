export type JobMode = "auto" | "video" | "audio" | "gallery";

export type JobSubmitInput = {
  url: string;
  platform?: string;
  mode?: JobMode;
  format?: string;
  quality?: string;
  turnstileToken?: string;
  pow?: {
    nonce: string;
    expiresAt: string;
    difficulty: number;
    signature: string;
    solution: string;
  };
};

export type QueuedJobResponse = {
  jobId: string;
  status: "queued";
  platform: string;
  estimatedCredits: number;
};

export type PlatformSummary = {
  slug: string;
  name: string;
  category: string;
  supportLevel: string;
  publicClaim: string;
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
  auditCategory: string;
  provider?: string;
  providerKind?: string;
  successRate?: number;
  medianExtractMs?: number;
  lastCheckedAt?: string;
  note?: string;
  authNeeded?: boolean;
  repaired?: boolean;
};

export type RecentDownload = {
  platform: string;
  title?: string;
  sourceUrl?: string;
  mode: string;
  format: string;
  status: string;
  createdAt: string;
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
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  provider?: string;
  title?: string;
  errorCode?: string;
  errorMessage?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  latestEvent?: {
    stage: string;
    message: string;
    details?: Record<string, unknown> | null;
    createdAt: string;
  };
};

export type JobStatus = {
  id: string;
  userId?: string;
  apiKeyId?: string;
  url: string;
  platform: string;
  mode: JobMode;
  format: string;
  quality: string;
  creditsReserved: number;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  creditsCharged: number;
  provider?: string;
  title?: string;
  outputPath?: string;
  outputSize?: number;
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
