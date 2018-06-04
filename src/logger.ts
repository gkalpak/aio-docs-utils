const {name} = require('../package.json');


export class Logger {
  error(...args: any[]): void {
    console.error(`[${name}]`, ...args);
  }

  log(...args: any[]): void {
    console.log(`[${name}]`, ...args);
  }
}

export const logger = new Logger;
