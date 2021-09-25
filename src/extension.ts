import {ExtensionContext, window} from 'vscode';
import {displayName} from '../package.json';
import {CodeSnippetIntellisenseFeature} from './code-snippet-intellisense';
import {extendMarkdownIt} from './markdown-it-plugins';
import {logger} from './shared/logger';
import {isNgProjectWatcher} from './shared/workspace-folder-watcher';


const features = [
  CodeSnippetIntellisenseFeature,
];

export function activate(context: ExtensionContext): {extendMarkdownIt: typeof extendMarkdownIt} {
  context.subscriptions.push(logger);
  context.subscriptions.push(isNgProjectWatcher);

  features.forEach(Feature => Feature.activate(context));
  context.subscriptions.push(window.setStatusBarMessage(`${displayName} activated.`, 5000));

  logger.log('Activated.');

  return {extendMarkdownIt};
}

export function deactivate(): void {
  logger.log('Deactivated.');
}
