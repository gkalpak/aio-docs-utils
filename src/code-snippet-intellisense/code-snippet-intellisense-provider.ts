import {parse} from 'path';
import {
  CancellationToken, CompletionContext, CompletionItem, CompletionItemProvider, Definition, DefinitionProvider, Hover,
  HoverProvider, Location, MarkdownString, Position, ProviderResult, Range, TextDocument, Uri,
} from 'vscode';
import {fileSystem as fs} from '../shared/file-system';
import {logger} from '../shared/logger';
import {padStart, unlessCancelledFactory} from '../shared/utils';
import {isNgProjectWatcher} from '../shared/workspace-folder-watcher';
import {codeSnippetUtils, ICodeSnippetInfo, ILinenums} from './code-snippet-utils';
import {DocregionExtractor, IDocregionInfo} from './docregion-extractor';


export interface ICodeSnippetInfoWithFilePath extends ICodeSnippetInfo {
  file: {path: string};
}

export class CodeSnippetIntellisenseProvider implements CompletionItemProvider, DefinitionProvider, HoverProvider {
  public static readonly COMPLETION_TRIGGER_CHARACTERS = ['=', '"', '\''];
  private readonly csInfoPerCompletionList = new WeakMap<CompletionItem, ICodeSnippetInfoWithFilePath>();

  private get disabled() { return !isNgProjectWatcher.matches; }

  constructor(public readonly extractPathPrefixRe: RegExp) {
  }

  public async provideCompletionItems(
      doc: TextDocument,
      pos: Position,
      token: CancellationToken,
      ctx: CompletionContext,
  ): Promise<CompletionItem[] | null> {
    if (this.disabled || !this.isInRegionAttribute(doc, pos)) {
      return null;
    }

    const csInfo = await this.getCodeSnippetInfo(doc, pos, 'Providing completion items');
    if (!csInfo) {
      return null;
    }

    const names = await this.extractDocregionNames(csInfo, token);

    return names.map(name => {
      const label = name || '<default>';
      const filterText = name;
      let insertText = name;

      switch (ctx.triggerCharacter) {
        case '=':
          insertText = `"${insertText}"`;
          break;
        case '"':
        case '\'':
          const line = doc.lineAt(pos.line);
          const nextChar = line.text[pos.character];
          if (nextChar !== ctx.triggerCharacter) {
            insertText = insertText + ctx.triggerCharacter;
          }
          break;
        default:
          break;
      }

      const item = {label, filterText, insertText};
      this.csInfoPerCompletionList.set(item, csInfo);

      return item;
    });
  }

  public async provideDefinition(
      doc: TextDocument,
      pos: Position,
      token: CancellationToken,
  ): Promise<Definition | null> {
    if (this.disabled) {
      return null;
    }

    const csInfo = await this.getCodeSnippetInfo(doc, pos, 'Providing definition');
    if (!csInfo) {
      return null;
    }

    const drInfo = await this.extractDocregionInfo(csInfo, token);
    if (!drInfo) {
      return null;
    }

    const exampleFile = Uri.file(csInfo.file.path);
    return drInfo.ranges.map(range => new Location(exampleFile, range));
  }

  public async provideHover(doc: TextDocument, pos: Position, token: CancellationToken): Promise<Hover | null> {
    if (this.disabled) {
      return null;
    }

    const csInfo = await this.getCodeSnippetInfo(doc, pos, 'Providing hover');
    if (!csInfo) {
      return null;
    }

    const drInfo = await this.extractDocregionInfo(csInfo, token);
    if (!drInfo) {
      return null;
    }

    const firstLinenum = this.getFirstLinenum(csInfo.attrs.linenums);

    const headerStr = !csInfo.attrs.header ? '' : `_${csInfo.attrs.header}_\n\n---\n`;
    const codeStr = this.withLinenums(drInfo.contents, firstLinenum);

    const contents = `${headerStr}\`\`\`${drInfo.fileType}\n${codeStr}\n\`\`\``;
    const range = new Range(csInfo.raw.startPos, csInfo.raw.endPos);

    return new Hover(contents, range);
  }

  public resolveCompletionItem(item: CompletionItem, token: CancellationToken): ProviderResult<CompletionItem> {
    if ((item.filterText === undefined) || !this.csInfoPerCompletionList.has(item)) {
      return null;
    }

    const originalCsInfo = this.csInfoPerCompletionList.get(item)!;
    const csInfo = {
      ...originalCsInfo,
      attrs: {
        ...originalCsInfo.attrs,
        region: item.filterText,
      },
    };

    return this.extractDocregionInfo(csInfo, token).then(drInfo => {
      if (!drInfo) {
        return null;
      }

      const codeStr = this.withLinenums(drInfo.contents, -1);
      const documentation = new MarkdownString(`\`\`\`${drInfo.fileType}\n${codeStr}\n\`\`\``);

      return {
        ...item,
        documentation,
      };
    });
  }

  protected extractDocregionInfo(
      csInfo: ICodeSnippetInfoWithFilePath,
      token: CancellationToken,
  ): Promise<IDocregionInfo | null> {
    return this.getDocregionExtractor(csInfo.file.path, token).
      then(extractor => extractor.extract(csInfo.attrs.region || ''));
  }

  protected extractDocregionNames(csInfo: ICodeSnippetInfoWithFilePath, token: CancellationToken): Promise<string[]> {
    return this.getDocregionExtractor(csInfo.file.path, token).
      then(extractor => extractor.getAvailableNames());
  }

  protected async getCodeSnippetInfo(
      doc: TextDocument,
      pos: Position,
      action: string,
  ): Promise<ICodeSnippetInfoWithFilePath | null> {
    logger.log(`${action} for '${doc.fileName}:${pos.line}:${pos.character}'...`);

    const csInfo = codeSnippetUtils.getInfo(doc, pos);
    if (!csInfo) {
      return null;
    }

    logger.log(`  Detected code snippet: ${csInfo.raw.contents}`);

    const examplePath = await this.getExamplePath(doc.fileName, csInfo.attrs.path);
    if (!examplePath) {
      return null;
    }

    logger.log(`  Located example file: ${examplePath}`);

    return {
      ...csInfo,
      file: {path: examplePath},
    };
  }

  protected getDocregionExtractor(filePath: string, token: CancellationToken): Promise<DocregionExtractor> {
    const fileType = parse(filePath).ext.slice(1);
    const unlessCancelled = unlessCancelledFactory(token);

    return fs.readFile(filePath).
      then(unlessCancelled(rawContents => DocregionExtractor.for(fileType, rawContents)));
  }

  protected isInRegionAttribute(doc: TextDocument, pos: Position): boolean {
    const line = doc.lineAt(pos.line).text;
    const whitespaceIdx = line.lastIndexOf(' ', pos.character);
    const attrStr = line.slice(whitespaceIdx + 1, pos.character);

    return /^region=(?:(["'])(?:(?!\1).)*)?$/.test(attrStr);
  }

  private async getExamplePath(containerDocPath: string, relativeExamplePath: string): Promise<string | null> {
    const pathPrefix = this.extractPathPrefixRe.exec(containerDocPath);
    const examplePath = pathPrefix && `${pathPrefix[0]}examples/${relativeExamplePath}`;

    return (!examplePath || !(await fs.exists(examplePath))) ? null : examplePath;
  }

  private getFirstLinenum(linenums: ILinenums): number {
    switch (linenums) {
      case false: return -1;
      case true: return 1;
      default: return linenums;
    }
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
