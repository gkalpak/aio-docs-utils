import {DocumentSelector, languages} from 'vscode';
import {BaseFeature} from '../shared/base-feature';
import {logger} from '../shared/logger';
import {CodeSnippetIntellisenseProvider} from './code-snippet-intellisense-provider';


export class CodeSnippetIntellisenseFeature extends BaseFeature {
  constructor() {
    super();

    // Register `CodeSnippetIntellisenseProvider` for guides.
    this.registerIntellisenseProvider(/^.*([\\/])aio\1content\1/i, {
      language: 'markdown',
      pattern: '**/aio/content/**',
      scheme: 'file',
    });
  }

  private registerIntellisenseProvider(extractPathPrefixRe: RegExp, docSelector: DocumentSelector): void {
    const intellisenseProvider = new CodeSnippetIntellisenseProvider(extractPathPrefixRe);

    this.disposables.push(languages.registerDefinitionProvider(docSelector, intellisenseProvider));
    this.disposables.push(languages.registerHoverProvider(docSelector, intellisenseProvider));

    logger.log(`Registered intellisense provider for: ${JSON.stringify(docSelector)}`);
  }
}
