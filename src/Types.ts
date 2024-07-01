export interface RateLimitData {
  max: number;
  left: number;
  resetAt: number;
}

export interface Config {
  /** Slack User ID */
  slackID: string;
  /** Hack Club API Key */
  APIKey: string;
  /** Slack User Token */
  token: string;
}
