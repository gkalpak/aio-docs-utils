// tslint:disable: max-classes-per-file

// Classes
export class MockHover {
  constructor(public readonly contents: string, public readonly range: MockRange) {
  }
}

export class MockLocation {
  constructor(public readonly uri: MockUri, public readonly range: MockRange) {
  }
}

export class MockMarkdownString {
  constructor(public readonly value: string) {
  }
}

export class MockPosition {
  constructor(public line: number, public character: number) {
  }
}

export class MockRange {
  public start: MockPosition;
  public end: MockPosition;

  constructor(startPos: MockPosition, endPos: MockPosition);
  constructor(startLine: number, startChar: number, endLine: number, endChar: number);
  constructor(
      startPosOrStartLine: MockPosition | number,
      endPosOrStartChar: MockPosition | number,
      endLine?: number,
      endChar?: number,
  ) {
    if ((endLine !== undefined) && (endChar !== undefined)) {
      startPosOrStartLine = new MockPosition(startPosOrStartLine as number, endPosOrStartChar as number);
      endPosOrStartChar = new MockPosition(endLine, endChar);
    }
    this.start = startPosOrStartLine as MockPosition;
    this.end = endPosOrStartChar as MockPosition;
  }
}

export class MockTextDocument {
  public get lineCount(): number { return this.lines.length; }
  private readonly lines: string[] = this.contents.split('\n');

  constructor(private readonly contents: string, public readonly fileName = '/angular/aio/content/guide.md') {
  }

  public lineAt(index: number): MockTextLine {
    return new MockTextLine(this.lines[index]);
  }

  public getText(range?: MockRange): string {
    if (!range) {
      return this.contents;
    }

    if (range.start.line === range.end.line) {
      return this.lines[range.start.line].slice(range.start.character, range.end.character);
    }

    return [
      this.lines[range.start.line].slice(range.start.character),
      ...this.lines.slice(range.start.line + 1, range.end.line),
      this.lines[range.end.line].slice(0, range.end.character),
    ].join('\n');
  }
}

export class MockTextLine {
  constructor(public readonly text: string) {
  }
}

export class MockUri {
  public static file(path: string): MockUri {
    return new MockUri(path);
  }

  private constructor(public readonly path: string) {
  }
}

// Exports
export const mockVscode = {
  Hover: MockHover,
  Location: MockLocation,
  MarkdownString: MockMarkdownString,
  Position: MockPosition,
  Range: MockRange,
  Uri: MockUri,
  languages: {
    registerCompletionItemProvider: noop,
    registerDefinitionProvider: noop,
    registerHoverProvider: noop,
  },
  window: {
    setStatusBarMessage: noop,
  },
};

// Helpers
function noop(): void {
  return;
}
