import {Position, TextDocument} from 'vscode';
import {
  CodeSnippetUtils, codeSnippetUtils, ICodeSnippetAttrInfo, ICodeSnippetHtmlInfo,
} from '../../../code-snippet-intellisense/code-snippet-utils';
import {stripIndentation} from '../../helpers/string-utils';
import {MockTextDocument} from '../../helpers/vscode.mock';


describe('CodeSnippetUtils', () => {
  const csUtils = codeSnippetUtils;

  describe('getInfo()', () => {
    const EOF_MARKER = '~ ~ ~ ~ ~ EOF ~ ~ ~ ~ ~';

    // Helpers
    const createTextDocument = (contents: string, name?: string): TextDocument =>
      new MockTextDocument(stripIndentation(contents.split(EOF_MARKER, 1)[0]), name) as any;
    const quote = (q: string, input: string) => input.replace(/%/g, q);
    const withBothQuotes = (cb: (q: string) => void) => ['"', '\''].forEach(cb);

    it('should return an `ICodeSnippetInfo` object (if inside a code snippet)', () => {
      const doc = createTextDocument(`
        line before
        text before <code-example path="foo"></code-example> text after
        line after
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);
      const someICodeSnippetInfoObject = jasmine.objectContaining<any>({
        attrs: jasmine.any(Object),
        file: jasmine.any(Object),
        html: jasmine.any(Object),
      });

      expect(csUtils.getInfo(doc, new Position(1, 13))).toEqual(someICodeSnippetInfoObject);
      expect(csUtils.getInfo(doc, new Position(1, 17))).toEqual(someICodeSnippetInfoObject);
      expect(csUtils.getInfo(doc, new Position(1, 37))).toEqual(someICodeSnippetInfoObject);
      expect(csUtils.getInfo(doc, new Position(1, 42))).toEqual(someICodeSnippetInfoObject);
      expect(csUtils.getInfo(doc, new Position(1, 51))).toEqual(someICodeSnippetInfoObject);
    });

    // `getHtmlInfo()`

    it('should return `null` if not inside a code snippet', () => {
      const doc = createTextDocument(`
        line before
        text before <code-example path="foo"></code-example> text after
        line after
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);

      expect(csUtils.getInfo(doc, new Position(0,  5))).toBeNull();
      expect(csUtils.getInfo(doc, new Position(1,  5))).toBeNull();
      expect(csUtils.getInfo(doc, new Position(1, 57))).toBeNull();
      expect(csUtils.getInfo(doc, new Position(2,  5))).toBeNull();
    });

    it('should detect the code snippet when another snippet is on the same line', () => {
      const doc = createTextDocument(`
        <code-example path="foo"></code-example> <code-example path="bar"></code-example>
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);
      const csInfo1 = csUtils.getInfo(doc, new Position(0, 15))!;
      const csInfo2 = csUtils.getInfo(doc, new Position(0, 55))!;

      expect(csInfo1).toEqual(jasmine.any(Object));
      expect(csInfo1.attrs.path).toBe('foo');
      expect(csInfo2).toEqual(jasmine.any(Object));
      expect(csInfo2.attrs.path).toBe('bar');
    });

    it('should detect multi-line code snippets', () => {
      withBothQuotes(q => {
        const doc = createTextDocument(quote(q, `
          <code-example
              path=%foo%>
          </code-example> <code-example path=%bar%></code-example>
          ${EOF_MARKER}
          0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                    012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
        `));

        expect(csUtils.getInfo(doc, new Position(0,  0))).toEqual(jasmine.any(Object));
        expect(csUtils.getInfo(doc, new Position(0, 10))).toEqual(jasmine.any(Object));
        expect(csUtils.getInfo(doc, new Position(0, 13))).toEqual(jasmine.any(Object));
        expect(csUtils.getInfo(doc, new Position(1,  0))).toEqual(jasmine.any(Object));
        expect(csUtils.getInfo(doc, new Position(1, 10))).toEqual(jasmine.any(Object));
        expect(csUtils.getInfo(doc, new Position(1, 15))).toEqual(jasmine.any(Object));
        expect(csUtils.getInfo(doc, new Position(2,  0))).toEqual(jasmine.any(Object));
        expect(csUtils.getInfo(doc, new Position(2, 10))).toEqual(jasmine.any(Object));
        expect(csUtils.getInfo(doc, new Position(2, 14))).toEqual(jasmine.any(Object));

        expect(csUtils.getInfo(doc, new Position(2, 15))).toBeNull();
        expect(csUtils.getInfo(doc, new Position(2, 56))).toBeNull();
      });
    });

    it('should recognize known attributes of code snippet elements', () => {
      withBothQuotes(q => {
        const doc = createTextDocument(quote(q, `
          <code-example
              class=%class%
              hide-copy=%hide-copy%
              hidecopy=%hidecopy%
              language=%language%
              linenums=%linenums%
              path=%path%
              region=%region%
              title=%title%>
          </code-example>
          <code-example
              unknown=%unknown%>
          </code-example>
          ${EOF_MARKER}
          0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                    012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
        `));

        expect(csUtils.getInfo(doc, new Position( 0, 10))).toEqual(jasmine.any(Object));
        expect(csUtils.getInfo(doc, new Position(10, 10))).toBeNull();
      });
    });

    it('should detect different types of code snippet tags', () => {
      const doc = createTextDocument(`
        <code-example path="foo"></code-example>
        <code-pane path="bar"></code-pane>
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);

      expect(csUtils.getInfo(doc, new Position(0, 10))).toEqual(jasmine.any(Object));
      expect(csUtils.getInfo(doc, new Position(1, 10))).toEqual(jasmine.any(Object));
    });

    it('should return `null` if open and close tags do not match', () => {
      const doc = createTextDocument(`
        <code-example path="foo"></code-pane>
        <code-pane
            path="bar">
        </code-example>
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);

      expect(csUtils.getInfo(doc, new Position(0, 10))).toBeNull();
      expect(csUtils.getInfo(doc, new Position(1, 10))).toBeNull();
    });

    it('should extract HTML info from single-line code snippets', () => {
      const doc = createTextDocument(`
        line before
        text before <code-example path="foo"></code-example> text after
        line after
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);
      const expectedHtmlInfo: ICodeSnippetHtmlInfo = {
        contents: '<code-example path="foo"></code-example>',
        endPos: new Position(1, 52),
        startPos: new Position(1, 12),
      };

      expect(csUtils.getInfo(doc, new Position(1, 17))!.html).toEqual(expectedHtmlInfo);
      expect(csUtils.getInfo(doc, new Position(1, 37))!.html).toEqual(expectedHtmlInfo);
      expect(csUtils.getInfo(doc, new Position(1, 44))!.html).toEqual(expectedHtmlInfo);
    });

    it('should extract HTML info from multi-line code snippets', () => {
      const doc = createTextDocument(`
        line before
        text before <code-example
                        path="foo">
                    </code-example> text after
        line after
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);
      const expectedHtmlInfo: ICodeSnippetHtmlInfo = {
        contents: '<code-example\n                path="foo">\n            </code-example>',
        endPos: new Position(3, 27),
        startPos: new Position(1, 12),
      };

      expect(csUtils.getInfo(doc, new Position(1, 17))!.html).toEqual(expectedHtmlInfo);
      expect(csUtils.getInfo(doc, new Position(2,  5))!.html).toEqual(expectedHtmlInfo);
      expect(csUtils.getInfo(doc, new Position(2, 22))!.html).toEqual(expectedHtmlInfo);
      expect(csUtils.getInfo(doc, new Position(3,  5))!.html).toEqual(expectedHtmlInfo);
      expect(csUtils.getInfo(doc, new Position(3, 22))!.html).toEqual(expectedHtmlInfo);
    });

    // `getAttrInfo()`

    it('should return `null` if there is no `path` attribute', () => {
      const doc = createTextDocument(`
        <code-example notpath="foo" neitherpath="bar" pathnot="baz" path-neither="qux"></code-example>
        <code-example linenums="foo" region="bar" title="baz"></code-example>
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);

      expect(csUtils.getInfo(doc, new Position(0, 10))).toBeNull();
      expect(csUtils.getInfo(doc, new Position(1, 10))).toBeNull();
    });

    it('should extract attributes info from single-line code snippets', () => {
      withBothQuotes(q => {
        const doc = createTextDocument(quote(q, `
          <code-example linenums=%true% path=%foo% region=%bar% title=%baz%></code-example>
          ${EOF_MARKER}
          0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                    012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
        `));
        const expectedAttrInfo: ICodeSnippetAttrInfo = {
          linenums: true,
          path: 'foo',
          region: 'bar',
          title: 'baz',
        };

        expect(csUtils.getInfo(doc, new Position(0,  5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(0, 66))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(0, 73))!.attrs).toEqual(expectedAttrInfo);
      });
    });

    it('should extract attributes info from multi-line code snippets', () => {
      withBothQuotes(q => {
        const doc = createTextDocument(quote(q, `
          <code-example
              linenums=%true%
              path=%foo%
              region=%bar%
              title=%baz%>
          </code-example>
          ${EOF_MARKER}
          0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                    012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
        `));
        const expectedAttrInfo: ICodeSnippetAttrInfo = {
          linenums: true,
          path: 'foo',
          region: 'bar',
          title: 'baz',
        };

        expect(csUtils.getInfo(doc, new Position(0,  5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(1,  0))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(2, 10))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(3,  0))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(4, 10))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(5,  0))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(5, 10))!.attrs).toEqual(expectedAttrInfo);
      });
    });

    it('should extract attributes info when there is no indentation', () => {
      withBothQuotes(q => {
        const doc = createTextDocument(quote(q, `
          <code-example
          linenums=%true%
          path=%foo%
          region=%bar%
          title=%baz%>
          </code-example>
          ${EOF_MARKER}
          0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                    012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
        `));
        const expectedAttrInfo: ICodeSnippetAttrInfo = {
          linenums: true,
          path: 'foo',
          region: 'bar',
          title: 'baz',
        };

        expect(csUtils.getInfo(doc, new Position(0, 5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(1, 5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(2, 5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(3, 5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(4, 5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(5, 5))!.attrs).toEqual(expectedAttrInfo);
      });
    });

    it('should support the different type of quotes in attribute values', () => {
      const doc = createTextDocument(`
        <code-example path="foo'bar" region='baz"qux'></code-example>
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);
      const expectedAttrInfo: Partial<ICodeSnippetAttrInfo> = {
        path: 'foo\'bar',
        region: 'baz"qux',
      };

      expect(csUtils.getInfo(doc, new Position(0,  5))!.attrs).toEqual(jasmine.objectContaining(expectedAttrInfo));
      expect(csUtils.getInfo(doc, new Position(0, 46))!.attrs).toEqual(jasmine.objectContaining(expectedAttrInfo));
      expect(csUtils.getInfo(doc, new Position(0, 53))!.attrs).toEqual(jasmine.objectContaining(expectedAttrInfo));
    });

    it('should not require `linenums` to be specified', () => {
      const doc = createTextDocument(`
        <code-example path="foo" region="bar" title="baz"></code-example>
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);

      expect(csUtils.getInfo(doc, new Position(0, 33))!.attrs).toEqual({
        linenums: 'auto',
        path: 'foo',
        region: 'bar',
        title: 'baz',
      });
    });

    it('should correctly translate `linenums`', () => {
      const doc = createTextDocument(`
        <code-example linenums="false" path="foo"></code-example>
        <code-example linenums="true" path="foo"></code-example>
        <code-example linenums="bar" path="foo"></code-example>
        <code-example linenums="42" path="foo"></code-example>
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);

      expect(csUtils.getInfo(doc, new Position(0, 33))!.attrs.linenums).toBe(false);
      expect(csUtils.getInfo(doc, new Position(1, 33))!.attrs.linenums).toBe(true);
      expect(csUtils.getInfo(doc, new Position(2, 33))!.attrs.linenums).toBe('auto');
      expect(csUtils.getInfo(doc, new Position(3, 33))!.attrs.linenums).toBe(42);
    });

    it('should not require `region` to be specified', () => {
      const doc = createTextDocument(`
        <code-example linenums="true" path="foo" title="baz"></code-example>
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);

      expect(csUtils.getInfo(doc, new Position(0, 33))!.attrs).toEqual({
        linenums: true,
        path: 'foo',
        region: null,
        title: 'baz',
      });
    });

    it('should not require `title` to be specified', () => {
      const doc = createTextDocument(`
        <code-example linenums="true" path="foo" region="bar"></code-example>
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);

      expect(csUtils.getInfo(doc, new Position(0, 33))!.attrs).toEqual({
        linenums: true,
        path: 'foo',
        region: 'bar',
        title: null,
      });
    });

    // `getFileInfo()`

    it('should extract file info from code snippets', () => {
      const doc = createTextDocument(`
        <code-example path="baz/qux"></code-example>
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `, '/foo/aio/content/bar');

      expect(csUtils.getInfo(doc, new Position(0, 22))!.file).toEqual({
        path: '/foo/aio/content/examples/baz/qux',
      });
    });

    it('should support Windows-style path separators', () => {
      const doc = createTextDocument(`
        <code-example path="baz/qux"></code-example>
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `, 'C:\\foo\\aio\\content\\bar');

      expect(csUtils.getInfo(doc, new Position(0, 22))!.file).toEqual({
        path: 'C:\\foo\\aio\\content\\examples/baz/qux',
      });
    });

    it('should set `file.path` to `null` if the containing document is not inside `aio/content/`', () => {
      const doc = createTextDocument(`
        <code-example path="baz/qux"></code-example>
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `, '/foo/not-aio/content/bar');

      expect(csUtils.getInfo(doc, new Position(0, 22))!.file).toEqual({
        path: null,
      });
    });
  });
});

describe('codeSnippetUtils', () => {
  it('should be a `CodeSnippetUtils` instance', () => {
    expect(codeSnippetUtils).toEqual(jasmine.any(CodeSnippetUtils));
  });
});
