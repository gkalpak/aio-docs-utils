import {ExtensionContext, window} from 'vscode';
import {CodeSnippetIntellisenseFeature} from './code-snippet-intellisense';
import {extendMarkdownIt} from './markdown-it-plugins';
import {logger} from './shared/logger';


// tslint:disable-next-line: no-var-requires
const {displayName} = require('../package.json');
const features = [
  CodeSnippetIntellisenseFeature,
];

export function activate(context: ExtensionContext): {extendMarkdownIt: typeof extendMarkdownIt} {
  context.subscriptions.push(logger);

  // tslint:disable-next-line: variable-name
  features.forEach(Feature => Feature.activate(context));
  context.subscriptions.push(window.setStatusBarMessage(`${displayName} activated.`, 5000));

  logger.log('Activated.');

  return {extendMarkdownIt};
}

export function deactivate(): void {
  logger.log('Deactivated.');
}
