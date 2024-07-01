import axios, { Axios, AxiosResponse } from 'axios';
import Store from './utils/Store';
import RateLimiter from './utils/RateLimiter';
import { Config, RateLimitData } from './Types';

export default class Client {
  public readonly axios: Axios;

  public readonly reads = new RateLimiter(10);
  public readonly writes = new RateLimiter(16);

  constructor(config: Config) {
    // @ts-ignore
    Store.config = config;

    this.axios = axios.create({
      baseURL: 'https://hackhour.hackclub.com',
      headers: {
        Authorization: 'Bearer ' + Store.getAPIKey(),
      },
    });
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
  public async getRemainingSessionTime(slackID: string = Store.getID()): Promise<{ active: false } | { active: true; remainingMS: number }> {
    const res = await this.queue('GET', '/api/clock/' + slackID);

    const ms = parseInt(res.data);

    if (ms === -1) return { active: false };
    else return { active: true, remainingMS: ms };
  }
}
