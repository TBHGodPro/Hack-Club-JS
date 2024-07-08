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
}

export interface SessionData {
  time: { totalMins: number; elapsedMins: number; remainingMins: number; createdAt: Date; endAt: Date };
  paused: boolean;
  completed: boolean;
  goal: string | null;
  work: string;
}

export type ResData<T> = { ok: false; error: string } | ({ ok: true } & T);
