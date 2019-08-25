import * as MarkdownIt from 'markdown-it';


declare module 'markdown-it' {
  // Despite what the official typings say, this function is expected to return a string.
  interface FixedTokenRender {
    (...args: Parameters<MarkdownIt.TokenRender>): string;
  }
}
