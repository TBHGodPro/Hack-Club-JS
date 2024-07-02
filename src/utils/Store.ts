import { Config } from '../Types';

export default class Store {
  private static config: Config;

  public static getID(): string {
    return Store.config.slackID;
  }

  public static getAPIKey(): string {
    return Store.config.APIKey;
  }
}
