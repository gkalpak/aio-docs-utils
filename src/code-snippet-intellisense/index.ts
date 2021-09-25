import {DocumentSelector, languages} from 'vscode';
import {BaseFeature} from '../shared/base-feature';
import {logger} from '../shared/logger';
import {CodeSnippetIntellisenseProvider} from './code-snippet-intellisense-provider';


export class CodeSnippetIntellisenseFeature extends BaseFeature {
  protected static readonly _displayName = 'CodeSnippetIntellisenseFeature';

  constructor() {
    super();

    // Register `CodeSnippetIntellisenseProvider` for guides.
    this.registerIntellisenseProvider(/^.*([\\/])aio\1content\1/i, {
      language: 'markdown',
      pattern: '**/aio/content/**',
      scheme: 'file',
    });

    // Register `CodeSnippetIntellisenseProvider` for API docs.
    this.registerIntellisenseProvider(/^.*([\\/])packages\1/i, {
      language: 'typescript',
      pattern: '**/packages/**',
      scheme: 'file',
    });
  }

  private registerIntellisenseProvider(extractPathPrefixRe: RegExp, docSelector: DocumentSelector): void {
    const intellisenseProvider = new CodeSnippetIntellisenseProvider(extractPathPrefixRe);
    const triggerChars = CodeSnippetIntellisenseProvider.COMPLETION_TRIGGER_CHARACTERS;

    this.disposables.push(languages.registerCompletionItemProvider(docSelector, intellisenseProvider, ...triggerChars));
    this.disposables.push(languages.registerDefinitionProvider(docSelector, intellisenseProvider));
    this.disposables.push(languages.registerHoverProvider(docSelector, intellisenseProvider));

    logger.log(`Registered intellisense provider for: ${JSON.stringify(docSelector)}`);
  }
}
