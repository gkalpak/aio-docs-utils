import {Disposable, window} from 'vscode';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {displayName, name} = require('../../package.json');

export class Logger implements Disposable {
  private channel = window.createOutputChannel(displayName);

  public dispose(): void {
    this.log(`Disposing ${this.constructor.name}...`);
    this.channel.dispose();
  }

  public error(...args: any[]): void {
    const ts = this.getTimestamp();
    console.error(`${ts} ${name}:`, ...args);
    this.channel.appendLine(`${ts} ERROR: ${args.join(' ')}`);
  }

  public log(...args: any[]): void {
    const ts = this.getTimestamp();
    console.log(`${ts} ${name}:`, ...args);
    this.channel.appendLine(`${ts} ${args.join(' ')}`);
  }

  private getTimestamp(): string {
    return `[${new Date().toISOString()}]`;
  }
}

export const logger = new Logger();
