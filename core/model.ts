export interface TokenUsageData {
  id?: string;
  project_id?: string;
  projectId?: string;
  tokens_used?: number;
  tokensUsed?: number;
  quota_limit?: number;
  quotaLimit?: number;
  last_updated?: string | Date;
  lastUpdated?: string | Date;
}

/**
 * Note: This file should be renamed to model.ts to support the syntax below.
 * It serves as the shared Type and Logic definition for the Billing Domain.
 */

/**
 * Billing Domain Entity
 * Encapsulates token usage logic and quota calculations.
 */
export class TokenUsage {
  public id?: string;
  public projectId: string;
  public tokensUsed: number;
  public quotaLimit: number;
  public lastUpdated?: string | Date;

  constructor(data: TokenUsageData) {
    this.id = data.id;
    this.projectId = data.projectId ?? data.project_id ?? "UNKNOWN_PROJECT";
    this.tokensUsed = Number(data.tokensUsed ?? data.tokens_used ?? 0);
    this.quotaLimit = Number(data.quotaLimit ?? data.quota_limit ?? 1000000);
    this.lastUpdated = data.lastUpdated ?? data.last_updated;
  }

  get usagePercentage() {
    return this.quotaLimit > 0 ? (this.tokensUsed / this.quotaLimit) * 100 : 0;
  }

  get isOverQuota(): boolean {
    return this.tokensUsed > this.quotaLimit;
  }

  public formatUsage(): string {
    return new Intl.NumberFormat('en-US').format(this.tokensUsed || 0);
  }
}