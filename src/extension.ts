import {ExtensionContext, window} from 'vscode';
import {CodeSnippetIntellisenseFeature} from './code-snippet-intellisense';
import {logger} from './shared/logger';


// tslint:disable-next-line: no-var-requires
const {displayName} = require('../package.json');

export function activate(context: ExtensionContext): void {
  const features = [
    CodeSnippetIntellisenseFeature,
  ];

  // tslint:disable-next-line: variable-name
  features.forEach(Feature => Feature.activate(context));
  window.showInformationMessage(`${displayName} activated.`);

  logger.log('Activated.');
}

export function deactivate(): void {
  logger.log('Deactivated.');
}
