import { readFileSync } from 'fs';
import { join } from 'path';
import { Config } from '../Types';

export default class Store {
  private static config: Config;

  public static getID(): string {
    return Store.config.slackID;
  }

  public static getAPIKey(): string {
    return Store.config.APIKey;
  }

  public static getSlackToken(): string {
    return Store.config.token;
  }
}
