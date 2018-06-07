// tslint:disable-next-line: no-var-requires
const {name} = require('../../package.json');


export class Logger {
  public error(...args: any[]): void {
    console.error(`[${name}]`, ...args);
  }

  public log(...args: any[]): void {
    console.log(`[${name}]`, ...args);
  }
}

export const logger = new Logger();
