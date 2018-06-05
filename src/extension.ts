import {ExtensionContext, window} from 'vscode';
import {logger} from './shared/logger';
import {CodeSnippetIntellisenseFeature} from './code-snippet-intellisense';


const {displayName} = require('../package.json');

export function activate(context: ExtensionContext): void {
  const features = [
    CodeSnippetIntellisenseFeature,
  ];

  features.forEach(Feature => Feature.activate(context));
  window.showInformationMessage(`${displayName} activated.`);

  logger.log('Activated.');
}

export function deactivate(): void {
  logger.log('Deactivated.');
}
