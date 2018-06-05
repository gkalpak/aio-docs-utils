import {existsSync} from 'fs';
import {parse} from 'path';
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
    const csInfo = this.getCodeSnippetInfo(doc, pos, 'Providing definition');
    if (!csInfo) {
      return null;
    }

    return this.extractDocregions(csInfo, token).then(drInfo => {
      const exampleFile = Uri.file(csInfo.file.path);
      return drInfo.ranges.map(range => new Location(exampleFile, range));
    });
  }

  public provideHover(doc: TextDocument, pos: Position, token: CancellationToken): ProviderResult<Hover> {
    const csInfo = this.getCodeSnippetInfo(doc, pos, 'Providing hover');
    if (!csInfo) {
      return null;
    }

    return this.extractDocregions(csInfo, token).then(drInfo => {
      const mdTitle = !csInfo.attrs.title ? '' : `_${csInfo.attrs.title}_\n\n---\n`;
      const mdCode = `\`\`\`\n${drInfo.contents}\n\`\`\``;

      const contents = `${mdTitle}${mdCode}`;
      const range = new Range(csInfo.html.startPos, csInfo.html.endPos);

      return new Hover(contents, range);
    });
  }

  protected extractDocregions(csInfo: CodeSnippetInfoWithFilePath, token: CancellationToken): Promise<DocregionInfo> {
    const fileType = parse(csInfo.file.path).ext.slice(1);
    const unlessCancelled = utils.unlessCancelledFactory(token);

    return utils.readFile(csInfo.file.path).then(unlessCancelled(rawContents => {
      const extractor = new DocregionExtractor(rawContents);
      return extractor.extract(fileType, csInfo.attrs.region || undefined);
    }));
  }

  protected getCodeSnippetInfo(doc: TextDocument, pos: Position, action: string): CodeSnippetInfoWithFilePath | null {
    logger.log(`${action} for '${doc.fileName}:${pos.line}:${pos.character}'...`);

    const csInfo = codeSnippetUtils.getInfo(doc, pos);
    if (!csInfo) {
      return null;
    }

    logger.log(`  Detected code snippet: ${csInfo.html.contents}`);

    if (!this.hasFilePath(csInfo) || !existsSync(csInfo.file.path)) {
      return null;
    }

    logger.log(`  Located example file: ${csInfo.file.path}`);

    return csInfo;
  }

  private hasFilePath(csInfo: CodeSnippetInfo): csInfo is CodeSnippetInfoWithFilePath {
    return !!csInfo.file.path;
  }
}
