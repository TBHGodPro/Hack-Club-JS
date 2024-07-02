import EventEmitter = require('events');
import { RateLimitData } from '../Types';
import TypedEventEmitter from 'typed-emitter';

export default class RateLimiter extends (EventEmitter as new () => TypedEventEmitter<RateLimiterEvents>) {
  private readonly list: (() => RateLimitData | Promise<RateLimitData>)[] = [];

  public max: number;
  public left: number;
  public reset: NodeJS.Timeout;

  constructor(max: number = 1) {
    super();

    this.max = max;
    this.left = max;

    (async () => {
      while (true) {
        if (this.list.length && this.left > 0) {
          const data = await this.list.shift()();
          this.left -= 1;

          if (data && typeof data === 'object' && !isNaN(data.max) && !isNaN(data.left) && !isNaN(data.resetAt)) {
            this.max = data.max;
            this.left = data.left;
            if (this.reset) clearTimeout(this.reset);
            this.reset = setTimeout(() => {
              this.left = this.max;
              this.reset = null;
            }, data.resetAt - Date.now());
          }
        }
        await new Promise(res => setTimeout(res, this.list.length && this.left > 0 ? 0 : 250));
      }
    })();
  }

  public queue(func: () => RateLimitData | Promise<RateLimitData>) {
    this.list.push(func);
  }
}

export type RateLimiterEvents = {
  info(info: RateLimitData): void;
};
