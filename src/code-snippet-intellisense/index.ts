import {existsSync} from 'fs';
import {parse} from 'path';
import {
  CancellationToken, Definition, DefinitionProvider, DocumentSelector, Hover, HoverProvider, languages, Location,
  Position, ProviderResult, Range, TextDocument, Uri,
} from 'vscode';
import {BaseFeature} from '../shared/base-feature';
import {logger} from '../shared/logger';
import {padStart, readFile, unlessCancelledFactory} from '../shared/utils';
import {codeSnippetUtils, ICodeSnippetFileInfo, ICodeSnippetInfo} from './code-snippet-utils';
import {DocregionExtractor, IDocregionInfo} from './docregion-extractor';


export interface ICodeSnippetInfoWithFilePath extends ICodeSnippetInfo {
  file: ICodeSnippetFileInfo & {path: string};
}

export class CodeSnippetIntellisenseFeature extends BaseFeature implements DefinitionProvider, HoverProvider {
  public static readonly AUTO_LINENUM_THRESHOLD = 10;
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
      if (!drInfo) {
        return null;
      }

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
      if (!drInfo) {
        return null;
      }

      const firstLinenum = this.getFirstLinenum(csInfo.attrs.linenums, drInfo.contents);

      const titleStr = !csInfo.attrs.title ? '' : `_${csInfo.attrs.title}_\n\n---\n`;
      const codeStr = this.withLinenums(drInfo.contents, firstLinenum);

      const contents = `${titleStr}\`\`\`${drInfo.fileType}\n${codeStr}\n\`\`\``;
      const range = new Range(csInfo.raw.startPos, csInfo.raw.endPos);

      return new Hover(contents, range);
    });
  }

  protected extractDocregions(
      csInfo: ICodeSnippetInfoWithFilePath,
      token: CancellationToken,
  ): Promise<IDocregionInfo | null> {
    const fileType = parse(csInfo.file.path).ext.slice(1);
    const unlessCancelled = unlessCancelledFactory(token);

    return readFile(csInfo.file.path).then(unlessCancelled(rawContents => {
      const extractor = DocregionExtractor.for(fileType, rawContents);
      return extractor.extract(csInfo.attrs.region || '');
    }));
  }

  protected getCodeSnippetInfo(doc: TextDocument, pos: Position, action: string): ICodeSnippetInfoWithFilePath | null {
    logger.log(`${action} for '${doc.fileName}:${pos.line}:${pos.character}'...`);

    const csInfo = codeSnippetUtils.getInfo(doc, pos);
    if (!csInfo) {
      return null;
    }

    logger.log(`  Detected code snippet: ${csInfo.raw.contents}`);

    if (!this.hasFilePath(csInfo) || !existsSync(csInfo.file.path)) {
      return null;
    }

    logger.log(`  Located example file: ${csInfo.file.path}`);

    return csInfo;
  }

  private getFirstLinenum(linenums: 'auto' | boolean | number, lines: string[]): number {
    switch (linenums) {
      case 'auto': return (lines.length > CodeSnippetIntellisenseFeature.AUTO_LINENUM_THRESHOLD) ? 1 : -1;
      case false: return -1;
      case true: return 1;
      default: return linenums;
    }
  }

  private hasFilePath(csInfo: ICodeSnippetInfo): csInfo is ICodeSnippetInfoWithFilePath {
    return !!csInfo.file.path;
  }

  private withLinenums(lines: string[], firstLinenum: number): string {
    if (firstLinenum > -1) {
      const maxLinenumLength = String(firstLinenum + lines.length).length;
      let nextLinenum = firstLinenum;

      lines = lines.map(line => {
        const linenumStr = padStart(String(nextLinenum++), maxLinenumLength);
        return `${linenumStr}. ${line}`;
      });
    }

    return lines.join('\n');
  }
}
