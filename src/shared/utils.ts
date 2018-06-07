import {createHash} from 'crypto';
import {readFile as fsReadFile} from 'fs';
import {CancellationToken} from 'vscode';


export const asPromised = <T = any>(
    fn: (...args: any[]) => void,
    context: any = null): ((...args: any[]) => Promise<T>) =>
  (...args) => new Promise((resolve, reject) => {
    const cb = (err: any, value: T) => err ? reject(err) : resolve(value);
    fn.apply(context, args.concat(cb));
  });

export const hash = (input: string, algorithm = 'sha256'): string => {
  const hashInstance = createHash(algorithm);
  hashInstance.update(input);
  return hashInstance.digest('hex');
};

export const padStart = (input: string, len: number, padStr = ' '): string => {
  const padding = padStr.repeat(Math.max(0, len - input.length));
  return `${padding}${input}`;
};

export const readFile = (fileName: string): Promise<string> =>
  asPromised(fsReadFile)(fileName, 'utf8');

export const unlessCancelledFactory = (token: CancellationToken) =>
  <TInput, TOutput>(fn: (input: TInput) => TOutput | Promise<TOutput>) =>
    (input: TInput) => {
      if (token.isCancellationRequested) {
        throw new Error('Cancelled.');
      }
      return fn(input);
    };
