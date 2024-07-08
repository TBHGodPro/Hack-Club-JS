import axios, { Axios, AxiosResponse } from 'axios';
import Store from './utils/Store';
import RateLimiter from './utils/RateLimiter';
import { Config, RateLimitData, ResData, SessionData } from './Types';
import Time from './utils/Time';
import EventEmitter = require('events');
import TypedEventEmitter from 'typed-emitter';

export default class Client extends (EventEmitter as new () => TypedEventEmitter<ClientEvents>) {
  public readonly axios: Axios;

  public readonly reads = new RateLimiter(10);
  public readonly writes = new RateLimiter(16);

  constructor(config: Config) {
    super();

    // @ts-ignore
    Store.config = config;

    this.axios = axios.create({
      baseURL: 'https://hackhour.hackclub.com',
      headers: {
        Authorization: 'Bearer ' + Store.getAPIKey(),
      },
    });

    this.reads.on('info', i => this.emit('ratelimit', 'READ', i));
    this.writes.on('info', i => this.emit('ratelimit', 'WRITE', i));
  }

  private async request<D extends AxiosResponse<any, any>>(type: 'GET', url: string): Promise<D>;
  private async request<D extends AxiosResponse<any, any>>(type: 'POST', url: string, data?: any): Promise<D>;
  private async request<D extends AxiosResponse<any, any>>(type: 'GET' | 'POST', url: string, data?: any): Promise<D> {
    switch (type) {
      case 'GET': {
        return await this.axios.get(url);
      }

      case 'POST': {
        return await this.axios.post(url, data);
      }
    }
  }

  private queue<D extends AxiosResponse<any, any>>(type: 'GET', url: string): Promise<D>;
  private queue<D extends AxiosResponse<any, any>>(type: 'POST', url: string, data?: any): Promise<D>;
  private queue<D extends AxiosResponse<any, any>>(type: 'GET' | 'POST', url: string, data?: any): Promise<D> {
    return new Promise(res => {
      this[type === 'POST' ? 'writes' : 'reads'].queue(async (): Promise<RateLimitData> => {
        const resp = (await this.request<D>(type as any, url, data).catch(err => {
          if ([429, 500].includes(err?.response?.status)) return err.response;
          throw err;
        })) as D;

        if (resp.status === 429) this.queue<D>(type as any, url, data).then(res);
        else res(resp);

        return {
          max: parseInt(resp.headers['x-ratelimit-limit']),
          left: parseInt(resp.headers['x-ratelimit-remaining']),
          resetAt: parseInt(resp.headers['x-ratelimit-reset']) * 1000,
        };
      });
    });
  }

  public async ping(): Promise<'pong'> {
    return (await this.request('GET', '/ping')).data;
  }

  public async getStatus(): Promise<{ activeSessions: number; airtableConnected: boolean; slackConnected: boolean }> {
    return (await this.request('GET', '/status')).data;
  }

  /** @deprecated */
  public async getRemainingSessionTime(slackID: string = Store.getID()): Promise<ResData<{ active: false } | { active: true; remainingMS: number }>> {
    const res = await this.queue('GET', '/api/clock/' + slackID);

    if (!isNaN(res.data)) {
      const ms = parseInt(res.data);

      if (ms === -1) return { ok: true, active: false };
      else return { ok: true, active: true, remainingMS: ms };
    } else return { ok: false, error: res.data.error };
  }

  public async getSessionData(): Promise<ResData<{ found: false; active: false } | ({ found: true; active: boolean; userID: string; messageTs: string } & SessionData)>> {
    const res = (await this.queue('GET', '/api/session/' + Store.getID())).data;

    if (res.ok)
      return {
        ok: true,
        found: true,
        active: res.data.remaining > 0 && !res.data.completed,
        userID: res.data.id,
        time: {
          totalMins: res.data.time,
          elapsedMins: res.data.elapsed,
          remainingMins: res.data.remaining,
          createdAt: new Date(res.data.createdAt),
          endAt: new Date(res.data.endTime),
        },
        paused: res.data.paused,
        completed: res.data.completed,
        goal: res.data.goal === 'No Goal' ? null : res.data.goal,
        work: res.data.work,
        messageTs: res.data.messageTs,
      };
    else {
      if (res.error === 'No active session found') return { ok: true, found: false, active: false };
      else return { ok: false, error: res.error };
    }
  }

  public async getUserStats(): Promise<ResData<{ sessions: number; time: Time }>> {
    const res = (await this.queue('GET', '/api/stats/' + Store.getID())).data;

    if (res.ok)
      return {
        ok: true,
        sessions: res.data.sessions,
        time: new Time(res.data.sessions * 60 * 60 * 1000),
      };
    else return { ok: false, error: res.error };
  }

  public async getUserGoals(): Promise<ResData<{ goals: { name: string; time: Time }[] }>> {
    const res = (await this.queue('GET', '/api/goals/' + Store.getID())).data;

    if (res.ok)
      return {
        ok: true,
        goals: res.data.map(g => ({
          name: g.name,
          time: new Time(g.minutes * 60 * 1000),
        })),
      };
    else return { ok: false, error: res.error };
  }

  public async getSessionHistory(): Promise<ResData<{ sessions: SessionData[] }>> {
    const res = (await this.queue('GET', '/api/history/' + Store.getID())).data;

    if (res.ok)
      return {
        ok: true,
        sessions: res.data.map(s => ({
          time: {
            totalMins: s.time,
            elapsedMins: s.elapsed,
            remainingMins: s.time - s.elapsed,
            createdAt: new Date(s.createdAt),
            endAt: new Date(new Date(s.createdAt).getTime() + s.elapsed * 60 * 1000),
          },
          paused: s.paused ?? false,
          completed: s.ended,
          goal: s.goal === 'No Goal' ? null : s.goal,
          work: s.work,
        })),
      };
    else return { ok: false, error: res.error };
  }

  public async start(work: string): Promise<ResData<{ created: false } | { created: true; session: { id: string; userID: string; createdAt: Date } }>> {
    if (typeof work !== 'string' || !work.length) throw new Error('Invalid Work! Work must but a string of at least 1 character!');

    const res = (await this.queue('POST', '/api/start/' + Store.getID(), { work })).data;

    if (res.ok)
      return {
        ok: true,
        created: true,
        session: {
          id: res.data.id,
          userID: res.data.slackId,
          createdAt: new Date(res.data.createdAt),
        },
      };
    else {
      if (res.error === 'You already have an active session') return { ok: true, created: false };
      else return { ok: false, error: res.error };
    }
  }

  public async cancel(): Promise<ResData<{ cancelled: false } | { cancelled: true; session: { id: string; userID: string; createdAt: Date } }>> {
    const res = (await this.queue('POST', '/api/cancel/' + Store.getID())).data;

    if (res.ok)
      return {
        ok: true,
        cancelled: true,
        session: {
          id: res.data.id,
          userID: res.data.slackId,
          createdAt: new Date(res.data.createdAt),
        },
      };
    else {
      if (res.error === 'Invalid user or no active session found') return { ok: true, cancelled: false };
      else return { ok: false, error: res.error };
    }
  }

  public async togglePaused(): Promise<ResData<{ toggled: false } | { toggled: true; session: { id: string; userID: string; createdAt: Date; paused: boolean } }>> {
    const res = (await this.queue('POST', '/api/pause/' + Store.getID())).data;

    if (res.ok)
      return {
        ok: true,
        toggled: true,
        session: {
          id: res.data.id,
          userID: res.data.slackId,
          createdAt: new Date(res.data.createdAt),
          paused: res.data.paused,
        },
      };
    else {
      if (res.error === 'Invalid user or no active session found') return { ok: true, toggled: false };
      else return { ok: false, error: res.error };
    }
  }
}

export type ClientEvents = {
  ratelimit(type: 'READ' | 'WRITE', info: RateLimitData): void;
};
