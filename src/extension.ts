import {ExtensionContext, window} from 'vscode';
import {CodeSnippetIntellisenseFeature} from './code-snippet-intellisense';
import {extendMarkdownIt} from './markdown-it-plugins';
import {logger} from './shared/logger';


// tslint:disable-next-line: no-var-requires
const {displayName} = require('../package.json');

export function activate(context: ExtensionContext): {extendMarkdownIt: typeof extendMarkdownIt} {
  const features = [
    CodeSnippetIntellisenseFeature,
  ];

  // tslint:disable-next-line: variable-name
  features.forEach(Feature => Feature.activate(context));
  context.subscriptions.push(window.setStatusBarMessage(`${displayName} activated.`, 5000));

  context.subscriptions.push(logger);

  logger.log('Activated.');

  return {extendMarkdownIt};
}

export function deactivate(): void {
  logger.log('Deactivated.');
}
