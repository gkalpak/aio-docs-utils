import {Position, Range, TextDocument} from 'vscode';


export interface ICodeSnippetAttrInfo {
  linenums: 'auto' | boolean | number;
  path: string;
  region: string | null;
  title: string | null;
}

export interface ICodeSnippetFileInfo {
  path: string | null;
}

export interface ICodeSnippetRawInfo {
  contents: string;
  startPos: Position;
  endPos: Position;
}

export interface ICodeSnippetInfo {
  raw: ICodeSnippetRawInfo;
  attrs: ICodeSnippetAttrInfo;
  file: ICodeSnippetFileInfo;
}

export class CodeSnippetUtils {
  private readonly TAGS = new Map<string, string>(['code-example', 'code-pane'].
    map<[string, string]>(tag => ([`<${tag}`, `</${tag}>`])));
  private readonly ATTRS = [
    'class',
    'hide-copy',
    'hidecopy',
    'language',
    'linenums',
    'path',
    'region',
    'title',
  ];
  private readonly HAS_ATTR_RE = new RegExp(`(?:^| )(?:${this.ATTRS.join('|')})[=>\s]`, 'i');

  public getInfo(doc: TextDocument, pos: Position): ICodeSnippetInfo | null {
    const rawInfo = this.getRawInfo(doc, pos);
    if (!rawInfo) {
      return null;
    }

    const attrInfo = this.getAttrInfo(rawInfo.contents);
    if (!attrInfo) {
      return null;
    }

    const fileInfo = this.getFileInfo(doc.fileName, attrInfo.path);

    return {
      attrs: attrInfo,
      file: fileInfo,
      raw: rawInfo,
    };
  }

  private getAttrInfo(contents: string): ICodeSnippetAttrInfo | null {
    const [linenumsAttr, path, region, title] = ['linenums', 'path', 'region', 'title']. map(attr => {
      const re = new RegExp(`\\s${attr}=(["'])((?:(?!\\1).)*)\\1`, 'i');
      const match = re.exec(contents);
      return match && match[2];
    });

    const linenums = (linenumsAttr === 'false') ?
      false : (linenumsAttr === 'true') ?
      true : (linenumsAttr === null) || isNaN(linenumsAttr as any) ?
      'auto' :
      parseInt(linenumsAttr, 10);

    return !path ? null : {linenums, path, region, title};
  }

  private getFileInfo(containerPath: string, relativePath: string): ICodeSnippetFileInfo {
    const examplePath = containerPath.replace(/^(.*([\\/])aio\2content\2).*$/, `$1examples/${relativePath}`);
    return {
      path: !examplePath.endsWith(relativePath) ? null : examplePath,
    };
  }

  private getRawInfo(doc: TextDocument, pos: Position): ICodeSnippetRawInfo | null {
    let lineIdx = pos.line;
    let charIdx = pos.character;
    let startPos!: Position;
    let endPos!: Position;
    let line: string;

    // Look upwards for the code snippet opening tag.
    let openTag: string | null = null;
    while (lineIdx >= 0) {
      line = doc.lineAt(lineIdx).text;
      openTag = this.isOpenLine(line, charIdx);

      if (openTag) {
        const startIdx = line.lastIndexOf(openTag, charIdx);
        startPos = new Position(lineIdx, startIdx);
        lineIdx = pos.line;
        charIdx = pos.character;
        break;
      } else if (this.isMiddleLine(line) || ((lineIdx === pos.line) && this.isCloseLine(line, charIdx))) {
        --lineIdx;
        charIdx = Infinity;
      } else {
        return null;
      }
    }

    // Look downwards for the `</code-example>` closing tag.
    let closeTag: string | null = null;
    while (lineIdx < doc.lineCount) {
      line = doc.lineAt(lineIdx).text;
      closeTag = this.isCloseLine(line, charIdx);

      if (closeTag) {
        const endIdx = this.indexOfCloseTag(line, closeTag, charIdx) + closeTag.length;
        endPos = new Position(lineIdx, endIdx);
        break;
      } else if ((lineIdx === startPos.line) || this.isMiddleLine(line)) {
        ++lineIdx;
        charIdx = 0;
      } else {
        return null;
      }
    }

    // Verify that the opening and closing tags match.
    if (this.TAGS.get(openTag!) !== closeTag) {
      return null;
    }

    return {
      contents: doc.getText(new Range(startPos, endPos)),
      endPos,
      startPos,
    };
  }

  private indexOfCloseTag(line: string, closeTag: string, afterIdx: number): number {
    const adjustedAfterIdx = Math.max(0, afterIdx - closeTag.length + 1);
    return line.indexOf(closeTag, adjustedAfterIdx);
  }

  private isCloseLine(line: string, afterIdx: number): string | null {
    const entry = Array.from(this.TAGS.entries()).find(([openTag, closeTag]) => {
      const closeTagIdx = this.indexOfCloseTag(line, closeTag, afterIdx);
      if (closeTagIdx === -1) {
        return false;
      }

      const openTagIdx = line.indexOf(openTag, afterIdx);
      if (openTagIdx === -1) {
        return true;
      }

      return closeTagIdx < openTagIdx;
    }) || null;

    return entry && entry[1];
  }

  private isMiddleLine(line: string): boolean {
    return this.HAS_ATTR_RE.test(line);
  }

  private isOpenLine(line: string, beforeIdx: number): string | null {
    const entry = Array.from(this.TAGS.entries()).find(([openTag, closeTag]) => {
      const openTagIdx = line.lastIndexOf(openTag, beforeIdx);
      if (openTagIdx === -1) {
        return false;
      }

      const closeTagIdx = this.lastIndexOfCloseTag(line, closeTag, beforeIdx);
      if (closeTagIdx === -1) {
        return true;
      }

      return openTagIdx > closeTagIdx;
    }) || null;

    return entry && entry[0];
  }

  private lastIndexOfCloseTag(line: string, closeTag: string, beforeIdx: number): number {
    const adjustedBeforeIdx = Math.max(0, beforeIdx - closeTag.length);
    return line.lastIndexOf(closeTag, adjustedBeforeIdx);
  }
}

export const codeSnippetUtils = new CodeSnippetUtils();
