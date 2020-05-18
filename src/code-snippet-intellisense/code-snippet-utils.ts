import {Position, Range, TextDocument} from 'vscode';
import {logger} from '../shared/logger';
import {kebabToCamelCase} from '../shared/utils';


export enum CodeSnippetType {
  HtmlTag,
  NgdocTag,
}

export type ILinenums = boolean | number;

export interface ICodeSnippetAttrInfo {
  header: string | null;
  linenums: ILinenums;
  path: string;
  region: string | null;
}

export interface ICodeSnippetRawInfo<T extends CodeSnippetType = CodeSnippetType> {
  type: T;
  contents: string;
  startPos: Position;
  endPos: Position;
}

export interface ICodeSnippetInfo<T extends CodeSnippetType = CodeSnippetType> {
  raw: ICodeSnippetRawInfo<T>;
  attrs: ICodeSnippetAttrInfo;
}

export interface IParsedNgdocAttrs {
  unnamed: string[];
  named: {[key: string]: string};
}

export class CodeSnippetUtils {
  private readonly HTML_TAG_PAIRS = ['code-example', 'code-pane'].
    map<[string, string]>(tag => ([`<${tag}`, `</${tag}>`]));
  private readonly NGDOC_TAG_PAIRS = ['example'].map<[string, string]>(tag => ([`{@${tag}`, '}']));
  private readonly TAGS = new Map<string, string>([
    ...this.HTML_TAG_PAIRS,
    ...this.NGDOC_TAG_PAIRS,
  ]);
  private readonly ATTRS = [
    'class',
    'header',
    'hide-copy',
    'hidecopy',
    'language',
    'linenums',
    'path',
    'region',
    'title',
  ];
  private readonly HAS_ATTR_RE = new RegExp(`(?:^|\\s)(?:${this.ATTRS.join('|')})(?:[=\\s>]|$)`, 'i');
  private readonly NAMED_NGDOC_ATTRS_RE = /[a-z-]+=(["'])(?:(?!\1).)*\1/gi;
  private readonly UNNAMED_NGDOC_ATTRS_RE = /(?:^|\s)[^=\s]+(?=\s|$)/g;

  public getInfo(doc: TextDocument, pos: Position): ICodeSnippetInfo | null {
    const rawInfo = this.getRawInfo(doc, pos);
    if (!rawInfo) {
      return null;
    }

    const attrInfo = this.getAttrInfo(rawInfo.type, rawInfo.contents);
    if (!attrInfo) {
      return null;
    }

    return {
      attrs: attrInfo,
      raw: rawInfo,
    };
  }

  private getAttrInfo(type: CodeSnippetType, contents: string): ICodeSnippetAttrInfo | null {
    switch (type) {
      case CodeSnippetType.HtmlTag:
        return this.getAttrInfoHtml(contents);
      case CodeSnippetType.NgdocTag:
        return this.getAttrInfoNgdoc(contents);
      default:
        logger.error(`Unknown \`CodeSnippetType\`: ${type} (${CodeSnippetType[type]})`);
        return null;
    }
  }

  private getAttrInfoHtml(contents: string): ICodeSnippetAttrInfo | null {
    const [headerAttr, linenumsAttr, path, region, title] = ['header', 'linenums', 'path', 'region', 'title'].
      map(attr => {
        const re = new RegExp(`\\s${attr}=(["'])((?:(?!\\1).)*)\\1`, 'i');
        const match = re.exec(contents);
        return match && match[2];
      });

    const header = (headerAttr === null) ? title : headerAttr;
    const linenums = this.normalizeLinenums(linenumsAttr);

    return !path ? null : {header, linenums, path, region};
  }

  private getAttrInfoNgdoc(contents: string): ICodeSnippetAttrInfo | null {
    const attrsStr = contents.slice('{@example'.length, -1 * '}'.length);
    const {named: namedAttrs, unnamed: unnamedAttrs} = this.parseNgdocAttrs(attrsStr);

    const header = namedAttrs.header || namedAttrs.title || unnamedAttrs.slice(2).join(' ') || null;
    const linenums = this.normalizeLinenums(namedAttrs.linenums || null);
    const path = unnamedAttrs[0];
    const region = namedAttrs.region || unnamedAttrs[1] || null;

    return !path ? null : {header, linenums, path, region};
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

    // Look downwards for the code snippet closing tag.
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
      type: this.getType(openTag!),
    };
  }

  private getType(openTag: string): CodeSnippetType {
    if (this.HTML_TAG_PAIRS.some(([ot]) => ot === openTag)) {
      return CodeSnippetType.HtmlTag;
    }

    if (this.NGDOC_TAG_PAIRS.some(([ot]) => ot === openTag)) {
      return CodeSnippetType.NgdocTag;
    }

    // (Should never happen.)
    throw new Error(`Unable to infer \`CodeSnippetType\` for opening tag \`${openTag}\`.`);
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
    return this.HAS_ATTR_RE.test(line) || (line.trim() === '');
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

  private normalizeLinenums(rawAttrValue: string | null): ILinenums {
    return (rawAttrValue === 'true') ?
      true : (rawAttrValue === 'false') ?
      false : (rawAttrValue === null) || isNaN(rawAttrValue as any) ?
      false :
      parseInt(rawAttrValue, 10);
  }

  private parseNgdocAttrs(attrsStr: string): IParsedNgdocAttrs {
    const unnamed = (attrsStr.match(this.UNNAMED_NGDOC_ATTRS_RE) || []).map(m => m.trim());
    const named = (attrsStr.match(this.NAMED_NGDOC_ATTRS_RE) || []).
      reduce((aggr, keyValuePair) => {
        const equalSignIndex = keyValuePair.indexOf('=');
        const key = kebabToCamelCase(keyValuePair.slice(0, equalSignIndex));
        const value = keyValuePair.slice(equalSignIndex + 2, -1);  // Ignore quotes.
        aggr[key] = value;
        return aggr;
      }, {} as {[key: string]: string});

    return {unnamed, named};
  }
}

export const codeSnippetUtils = new CodeSnippetUtils();
