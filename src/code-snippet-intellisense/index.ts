import {existsSync} from 'fs';
import {
  CancellationToken, Definition, DefinitionProvider, DocumentSelector, Hover, HoverProvider, languages, Location,
  Position, ProviderResult, Range, TextDocument, Uri,
} from 'vscode';
import {BaseFeature} from '../shared/base-feature';
import {logger} from '../shared/logger';
import {utils} from '../shared/utils';
import {CodeSnippetFileInfo, CodeSnippetInfo, codeSnippetUtils} from './code-snippet-utils';
import {DocregionExtractor, DocregionInfo} from './docregion-extractor';


export interface CodeSnippetInfoWithFilePath extends CodeSnippetInfo {
  file: CodeSnippetFileInfo & {path: string};
}

export class CodeSnippetIntellisenseFeature extends BaseFeature implements DefinitionProvider, HoverProvider {
  private static readonly DOC_SELECTOR: DocumentSelector = {
    language: 'markdown',
    pattern: '**/aio/content/**',
    scheme: 'file',
  };

  constructor() {
    super();
    const selector = CodeSnippetIntellisenseFeature.DOC_SELECTOR;

    // Register as `DefinitionProvider`.
    this.disposables.push(languages.registerDefinitionProvider(selector, this));

    // Register as `HoverProvider`.
    this.disposables.push(languages.registerHoverProvider(selector, this));
  }

  public provideDefinition(doc: TextDocument, pos: Position, token: CancellationToken): ProviderResult<Definition> {
    const ceInfo = this.getCodeSnippetInfo(doc, pos, 'Providing definition');
    if (!ceInfo) {
      return null;
    }

    return this.extractDocregions(ceInfo, token).then(drInfo => {
      const exampleFile = Uri.file(ceInfo.file.path);
      return drInfo.ranges.map(range => new Location(exampleFile, range));
    });
  }

  public provideHover(doc: TextDocument, pos: Position, token: CancellationToken): ProviderResult<Hover> {
    const ceInfo = this.getCodeSnippetInfo(doc, pos, 'Providing hover');
    if (!ceInfo) {
      return null;
    }

    return this.extractDocregions(ceInfo, token).then(drInfo => {
      const mdTitle = !ceInfo.attrs.title ? '' : `_${ceInfo.attrs.title}_\n\n---\n`;
      const mdCode = `\`\`\`\n${drInfo.contents}\n\`\`\``;

      const contents = `${mdTitle}${mdCode}`;
      const range = new Range(ceInfo.html.startPos, ceInfo.html.endPos);

      return new Hover(contents, range);
    });
  }

  protected extractDocregions(csInfo: CodeSnippetInfoWithFilePath, token: CancellationToken): Promise<DocregionInfo> {
    const unlessCancelled = utils.unlessCancelledFactory(token);
    return utils.readFile(csInfo.file.path).then(unlessCancelled(rawContents => {
      const extractor = new DocregionExtractor(rawContents);
      return extractor.extract(csInfo.attrs.region || undefined);
    }));
  }

  protected getCodeSnippetInfo(doc: TextDocument, pos: Position, action: string): CodeSnippetInfoWithFilePath | null {
    logger.log(`${action} for '${doc.fileName}:${pos.line}:${pos.character}'...`);

    const cdInfo = codeSnippetUtils.getInfo(doc, pos);
    if (!cdInfo) {
      return null;
    }

    logger.log(`  Detected code snippet: ${cdInfo.html.contents}`);

    if (!this.hasFilePath(cdInfo) || !existsSync(cdInfo.file.path)) {
      return null;
    }

    logger.log(`  Located example file: ${cdInfo.file.path}`);

    return cdInfo;
  }

  private hasFilePath(info: CodeSnippetInfo): info is CodeSnippetInfoWithFilePath {
    return !!info.file.path;
  }
}
