/* eslint-disable max-classes-per-file */

export interface IDocregionMatcher {
  regionStartRe: RegExp;
  regionEndRe: RegExp;
  plasterRe: RegExp;

  createPlasterComment(plaster: string): string;
}

/**
 * Used in languages that support block comments only.
 * E.g.: CSS
 */
class BlockCommentDocregionMatcher implements IDocregionMatcher {
  public readonly regionStartRe = /^\s*\/\*\s*#docregion\s*(.*?)\s*\*\/\s*$/;
  public readonly regionEndRe = /^\s*\/\*\s*#enddocregion\s*(.*?)\s*\*\/\s*$/;
  public readonly plasterRe = /^\s*\/\*\s*#docplaster\s*(.*?)\s*\*\/\s*$/;

  public createPlasterComment(plaster: string): string {
    return `/* ${plaster} */`;
  }
}

/**
 * Used in languages that support both block and inline comments.
 * E.g.: TypeScript, JavaScript
 */
class MixedCommentDocregionMatcher extends BlockCommentDocregionMatcher {
  public override readonly regionStartRe = /^\s*\/\/\s*#docregion\s*(.*)$/;
  public override readonly regionEndRe = /^\s*\/\/\s*#enddocregion\s*(.*)$/;
  public override readonly plasterRe = /^\s*\/\/\s*#docplaster\s*(.*)$/;
}

/**
 * Used in languages that support inline comments only.
 * E.g.: Pug
 */
class InlineCommentDocregionMatcher extends MixedCommentDocregionMatcher {
  public override createPlasterComment(plaster: string): string {
    return `// ${plaster}`;
  }
}

/**
 * Used in languages that support hash comments only.
 * E.g.: Bash, Yaml
 */
class HashCommentDocregionMatcher implements IDocregionMatcher {
  public readonly regionStartRe = /^\s*##?\s*#docregion\s*(.*)$/;
  public readonly regionEndRe = /^\s*##?\s*#enddocregion\s*(.*)$/;
  public readonly plasterRe = /^\s*##?\s*#docplaster\s*(.*)$/;

  public createPlasterComment(plaster: string): string {
    return `# ${plaster}`;
  }
}

/**
 * Used in languages that support HTML-like comments only.
 * E.g.: HTML, SVG
 */
class HtmlCommentDocregionMatcher implements IDocregionMatcher {
  public readonly regionStartRe = /^\s*<!--\s*#docregion\s*([^>]*?)\s*(?:-->\s*)?$/;
  public readonly regionEndRe = /^\s*<!--\s*#enddocregion\s*(.*?)\s*-->\s*$/;
  public readonly plasterRe = /^\s*<!--\s*#docplaster\s*(.*?)\s*-->\s*$/;

  public createPlasterComment(plaster: string): string {
    return `<!-- ${plaster} -->`;
  }
}

export const docregionMatchers = {
  blockComment: new BlockCommentDocregionMatcher(),
  hashComment: new HashCommentDocregionMatcher(),
  htmlComment: new HtmlCommentDocregionMatcher(),
  inlineComment: new InlineCommentDocregionMatcher(),
  mixedComment: new MixedCommentDocregionMatcher(),
};

export const getDocregionMatcher = (fileType: string): IDocregionMatcher => {
  switch (fileType.toLowerCase()) {
    case 'conf':
    case 'sh':
    case 'yaml':
    case 'yml':
      return docregionMatchers.hashComment;

    case 'css':
      return docregionMatchers.blockComment;

    case 'html':
    case 'svg':
      return docregionMatchers.htmlComment;

    case 'jade':
    case 'json':
    case 'json.annotated':
    case 'pug':
      return docregionMatchers.inlineComment;

    default:
      return docregionMatchers.mixedComment;
  }
};
