export default class Time {
  private readonly ms: number;

  constructor(ms: number) {
    this.ms = ms;
  }

  public getMS() {
    return this.ms;
  }

  public getSeconds() {
    return this.ms / 1000;
  }

  public getMinutes() {
    return this.ms / 1000 / 60;
  }

  public getHours() {
    return this.ms / 1000 / 60 / 60;
  }

  public getDays() {
    return this.ms / 1000 / 60 / 60 / 24;
  }

  public getWeeks() {
    return this.ms / 1000 / 60 / 60 / 24 / 7;
  }

  public getMonths() {
    return this.ms / 1000 / 60 / 60 / 24 / 28;
  }

  public getTrueMonths() {
    return this.ms / 1000 / 60 / 60 / 24 / (365 / 12);
  }

  public getYears() {
    return this.ms / 1000 / 60 / 60 / 24 / 365;
  }
}
