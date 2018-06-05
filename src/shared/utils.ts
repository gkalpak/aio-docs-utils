import {readFile} from 'fs';
import {CancellationToken} from 'vscode';


export class Utils{
  private readonly readFileAsPromised = this.asPromised(readFile);

  public asPromised<T = any>(fn: (...args: any[]) => void, context: any = null): (...args: any[]) => Promise<T> {
    return (...args) => new Promise((resolve, reject) => {
      const cb = (err: any, value: T) => err ? reject(err) : resolve(value);
      fn.apply(context, args.concat(cb));
    });
  }

  public readFile(fileName: string): Promise<string> {
    return this.readFileAsPromised(fileName, 'utf8');
  }

  public unlessCancelledFactory(token: CancellationToken) {
    return <TInput, TOutput>(fn: (input: TInput) => TOutput | Promise<TOutput>) =>
      (input: TInput) => {
        if (token.isCancellationRequested) {
          throw new Error('Cancelled.');
        }
        return fn(input);
      };
  }
}

export const utils = new Utils;
