import {Position, TextDocument} from 'vscode';
import {
  CodeSnippetType, CodeSnippetUtils, codeSnippetUtils, ICodeSnippetAttrInfo, ICodeSnippetRawInfo,
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
        text before {@example foo} text after
        line after
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);
      const someICodeSnippetInfoObject = jasmine.objectContaining<any>({
        attrs: jasmine.any(Object),
        raw: jasmine.any(Object),
      });

      expect(csUtils.getInfo(doc, new Position(1, 13))).toEqual(someICodeSnippetInfoObject);
      expect(csUtils.getInfo(doc, new Position(1, 17))).toEqual(someICodeSnippetInfoObject);
      expect(csUtils.getInfo(doc, new Position(1, 37))).toEqual(someICodeSnippetInfoObject);
      expect(csUtils.getInfo(doc, new Position(1, 42))).toEqual(someICodeSnippetInfoObject);
      expect(csUtils.getInfo(doc, new Position(1, 51))).toEqual(someICodeSnippetInfoObject);

      expect(csUtils.getInfo(doc, new Position(2, 13))).toEqual(someICodeSnippetInfoObject);
      expect(csUtils.getInfo(doc, new Position(2, 20))).toEqual(someICodeSnippetInfoObject);
      expect(csUtils.getInfo(doc, new Position(2, 25))).toEqual(someICodeSnippetInfoObject);
    });

    // `getRawInfo()`

    it('should return `null` if not inside a code snippet', () => {
      const doc = createTextDocument(`
        line before
        text before <code-example path="foo"></code-example> text after
        text before {@example foo} text after
        line after
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);

      expect(csUtils.getInfo(doc, new Position(0,  5))).toBeNull();
      expect(csUtils.getInfo(doc, new Position(1,  5))).toBeNull();
      expect(csUtils.getInfo(doc, new Position(1, 57))).toBeNull();
      expect(csUtils.getInfo(doc, new Position(2,  5))).toBeNull();
      expect(csUtils.getInfo(doc, new Position(2, 31))).toBeNull();
      expect(csUtils.getInfo(doc, new Position(3,  5))).toBeNull();
    });

    it('should detect the code snippet when another snippet is on the same line', () => {
      const doc = createTextDocument(`
        <code-example path="foo"></code-example> <code-example path="bar"></code-example>
        {@example foo} {@example bar}
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);
      const csInfo1 = csUtils.getInfo(doc, new Position(0, 15))!;
      const csInfo2 = csUtils.getInfo(doc, new Position(0, 55))!;
      const csInfo3 = csUtils.getInfo(doc, new Position(1,  8))!;
      const csInfo4 = csUtils.getInfo(doc, new Position(1, 23))!;

      expect(csInfo1).toEqual(jasmine.any(Object));
      expect(csInfo1.attrs.path).toBe('foo');
      expect(csInfo2).toEqual(jasmine.any(Object));
      expect(csInfo2.attrs.path).toBe('bar');

      expect(csInfo3).toEqual(jasmine.any(Object));
      expect(csInfo3.attrs.path).toBe('foo');
      expect(csInfo4).toEqual(jasmine.any(Object));
      expect(csInfo4.attrs.path).toBe('bar');
    });

    it('should detect multi-line code snippets', () => {
      withBothQuotes(q => {
        const doc = createTextDocument(quote(q, `
          <code-example
              path=%foo%>
          </code-example> <code-example path=%bar%></code-example>

          {@example foo
              region=%foo-region%
          } {@example bar}
          ${EOF_MARKER}
          0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                    012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
        `));

        // Type: `HtmlTag`
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

        // Type: `NgdocTag`
        expect(csUtils.getInfo(doc, new Position(4,  0))).toEqual(jasmine.any(Object));
        expect(csUtils.getInfo(doc, new Position(4, 10))).toEqual(jasmine.any(Object));
        expect(csUtils.getInfo(doc, new Position(4, 13))).toEqual(jasmine.any(Object));
        expect(csUtils.getInfo(doc, new Position(5,  0))).toEqual(jasmine.any(Object));
        expect(csUtils.getInfo(doc, new Position(5, 10))).toEqual(jasmine.any(Object));
        expect(csUtils.getInfo(doc, new Position(5, 23))).toEqual(jasmine.any(Object));
        expect(csUtils.getInfo(doc, new Position(6,  0))).toEqual(jasmine.any(Object));

        expect(csUtils.getInfo(doc, new Position(6,  1))).toBeNull();
        expect(csUtils.getInfo(doc, new Position(6, 16))).toBeNull();
      });
    });

    it('should recognize known attributes of code snippet elements on a line', () => {
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
              header=%header%
              header unknown
              unknown header
              header
              title=%title%
              title unknown
              unknown title
              title>
          </code-example>
          <code-example
              unknown=%unknown%>
          </code-example>

          {@example path
              class=%class%
              hide-copy=%hide-copy%
              hidecopy=%hidecopy%
              language=%language%
              linenums=%linenums%
              region=%region%
              header=%header%
              header unknown
              unknown header
              header
              title=%title%
              title unknown
              unknown title
              title}
          {@example path
              unknown=%unknown%
          }
          ${EOF_MARKER}
          0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                    012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
        `));

        expect(csUtils.getInfo(doc, new Position( 0, 10))).toEqual(jasmine.any(Object));
        expect(csUtils.getInfo(doc, new Position(17, 10))).toBeNull();

        expect(csUtils.getInfo(doc, new Position(21, 10))).toEqual(jasmine.any(Object));
        expect(csUtils.getInfo(doc, new Position(36, 10))).toBeNull();
      });
    });

    it('should detect different types of code snippet tags', () => {
      const doc = createTextDocument(`
        <code-example path="foo"></code-example>
        <code-pane path="bar"></code-pane>
        {@example baz}
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);

      expect(csUtils.getInfo(doc, new Position(0, 10))).toEqual(jasmine.any(Object));
      expect(csUtils.getInfo(doc, new Position(1, 10))).toEqual(jasmine.any(Object));
      expect(csUtils.getInfo(doc, new Position(2, 10))).toEqual(jasmine.any(Object));
    });

    it('should return `null` if open and close tags do not match', () => {
      const doc = createTextDocument(`
        <code-example path="foo"></code-pane>
        <code-pane
            path="bar">
        </code-example>
        <code example path="baz"}
        {@example qux></code-pane>
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);

      expect(csUtils.getInfo(doc, new Position(0, 10))).toBeNull();
      expect(csUtils.getInfo(doc, new Position(1, 10))).toBeNull();
      expect(csUtils.getInfo(doc, new Position(4, 10))).toBeNull();
      expect(csUtils.getInfo(doc, new Position(5, 10))).toBeNull();
    });

    it('should extract raw info from single-line code snippets', () => {
      const doc = createTextDocument(`
        line before
        text before <code-example path="foo"></code-example> text after
        line in-between
        text before {@example foo} text after
        line after
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);
      const expectedRawInfo1: ICodeSnippetRawInfo<CodeSnippetType.HtmlTag> = {
        contents: '<code-example path="foo"></code-example>',
        endPos: new Position(1, 52),
        startPos: new Position(1, 12),
        type: CodeSnippetType.HtmlTag,
      };
      const expectedRawInfo2: ICodeSnippetRawInfo<CodeSnippetType.NgdocTag> = {
        contents: '{@example foo}',
        endPos: new Position(3, 26),
        startPos: new Position(3, 12),
        type: CodeSnippetType.NgdocTag,
      };

      expect(csUtils.getInfo(doc, new Position(1, 17))!.raw).toEqual(expectedRawInfo1);
      expect(csUtils.getInfo(doc, new Position(1, 37))!.raw).toEqual(expectedRawInfo1);
      expect(csUtils.getInfo(doc, new Position(1, 44))!.raw).toEqual(expectedRawInfo1);

      expect(csUtils.getInfo(doc, new Position(3, 13))!.raw).toEqual(expectedRawInfo2);
      expect(csUtils.getInfo(doc, new Position(3, 17))!.raw).toEqual(expectedRawInfo2);
      expect(csUtils.getInfo(doc, new Position(3, 25))!.raw).toEqual(expectedRawInfo2);
    });

    it('should extract raw info from multi-line code snippets', () => {
      const doc = createTextDocument(`
        line before
        text before <code-example
                        path="foo">
                    </code-example> text after
        line in-between
        text before {@example foo
                        region="bar"
                    } text after
        line after
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);
      const expectedRawInfo1: ICodeSnippetRawInfo<CodeSnippetType.HtmlTag> = {
        contents: '<code-example\n                path="foo">\n            </code-example>',
        endPos: new Position(3, 27),
        startPos: new Position(1, 12),
        type: CodeSnippetType.HtmlTag,
      };
      const expectedRawInfo2: ICodeSnippetRawInfo<CodeSnippetType.NgdocTag> = {
        contents: '{@example foo\n                region="bar"\n            }',
        endPos: new Position(7, 13),
        startPos: new Position(5, 12),
        type: CodeSnippetType.NgdocTag,
      };

      expect(csUtils.getInfo(doc, new Position(1, 17))!.raw).toEqual(expectedRawInfo1);
      expect(csUtils.getInfo(doc, new Position(2,  5))!.raw).toEqual(expectedRawInfo1);
      expect(csUtils.getInfo(doc, new Position(2, 22))!.raw).toEqual(expectedRawInfo1);
      expect(csUtils.getInfo(doc, new Position(3,  5))!.raw).toEqual(expectedRawInfo1);
      expect(csUtils.getInfo(doc, new Position(3, 22))!.raw).toEqual(expectedRawInfo1);

      expect(csUtils.getInfo(doc, new Position(5, 17))!.raw).toEqual(expectedRawInfo2);
      expect(csUtils.getInfo(doc, new Position(6,  5))!.raw).toEqual(expectedRawInfo2);
      expect(csUtils.getInfo(doc, new Position(6, 22))!.raw).toEqual(expectedRawInfo2);
      expect(csUtils.getInfo(doc, new Position(7,  5))!.raw).toEqual(expectedRawInfo2);
      expect(csUtils.getInfo(doc, new Position(7, 12))!.raw).toEqual(expectedRawInfo2);
    });

    // `getAttrInfo()`

    it('should return `null` if there is no `path` attribute', () => {
      const doc = createTextDocument(`
        <code-example notpath="foo" neitherpath="bar" pathnot="baz" path-neither="qux"></code-example>
        <code-example linenums="foo" region="bar" header="baz" title="qux"></code-example>

        {@example linenums="foo" region="bar" header="baz" title="qux"}
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);

      expect(csUtils.getInfo(doc, new Position(0, 10))).toBeNull();
      expect(csUtils.getInfo(doc, new Position(1, 10))).toBeNull();

      expect(csUtils.getInfo(doc, new Position(3, 10))).toBeNull();
    });

    it('should extract attributes info from single-line code snippets', () => {
      withBothQuotes(q => {
        const doc = createTextDocument(quote(q, `
          <code-example header=%baz% linenums=%true% path=%foo% region=%bar%></code-example>
          <code-example linenums=%true% path=%foo% region=%bar% title=%baz%></code-example>

          {@example foo linenums=%true% region=%bar% header=%baz%}
          {@example foo linenums=%true% region=%bar% title=%baz%}
          {@example foo linenums=%true% bar header=%baz%}
          {@example foo linenums=%true% bar title=%baz%}
          {@example foo linenums=%true% bar baz}
          ${EOF_MARKER}
          0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                    012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
        `));
        const expectedAttrInfo: ICodeSnippetAttrInfo = {
          header: 'baz',
          linenums: true,
          path: 'foo',
          region: 'bar',
        };

        expect(csUtils.getInfo(doc, new Position(0,  5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(0, 66))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(0, 73))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(1,  5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(1, 66))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(1, 73))!.attrs).toEqual(expectedAttrInfo);

        expect(csUtils.getInfo(doc, new Position(3,  5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(3, 25))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(4,  5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(4, 25))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(5,  5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(5, 25))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(6,  5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(6, 25))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(7,  5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(7, 25))!.attrs).toEqual(expectedAttrInfo);
      });
    });

    it('should extract attributes info from multi-line code snippets', () => {
      withBothQuotes(q => {
        const doc = createTextDocument(quote(q, `
          <code-example
              header=%baz%
              linenums=%true%
              path=%foo%
              region=%bar%>
          </code-example>
          <code-example
              linenums=%true%
              path=%foo%
              region=%bar%
              title=%baz%>
          </code-example>

          {@example foo
              header=%baz%
              linenums=%true%
              region=%bar%
          }
          {@example foo
              linenums=%true%
              region=%bar%
              title=%baz%
          }
          {@example foo
              header=%baz%
              linenums=%true% bar
          }
          {@example foo
              linenums=%true%
              bar title=%baz%
          }
          {@example foo bar baz
              linenums=%true%}
          ${EOF_MARKER}
          0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                    012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
        `));
        const expectedAttrInfo: ICodeSnippetAttrInfo = {
          header: 'baz',
          linenums: true,
          path: 'foo',
          region: 'bar',
        };

        // First `<code-example>`.
        expect(csUtils.getInfo(doc, new Position( 0,  5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position( 1,  0))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position( 2, 10))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position( 3,  0))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position( 4, 10))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position( 5,  0))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position( 5, 10))!.attrs).toEqual(expectedAttrInfo);
        // Second `<code-example>`.
        expect(csUtils.getInfo(doc, new Position( 6,  5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position( 7,  0))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position( 8, 10))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position( 9,  0))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(10, 10))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(11,  0))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(11, 10))!.attrs).toEqual(expectedAttrInfo);

        // First `{@example}`.
        expect(csUtils.getInfo(doc, new Position(13,  5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(14, 10))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(15,  0))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(16, 10))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(17,  0))!.attrs).toEqual(expectedAttrInfo);
        // Second `{@example}`.
        expect(csUtils.getInfo(doc, new Position(18,  5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(19, 10))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(20,  0))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(21, 10))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(22,  0))!.attrs).toEqual(expectedAttrInfo);
        // Third `{@example}`.
        expect(csUtils.getInfo(doc, new Position(23,  5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(24,  0))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(25, 10))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(26,  0))!.attrs).toEqual(expectedAttrInfo);
        // Fourth `{@example}`.
        expect(csUtils.getInfo(doc, new Position(27,  5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(28,  0))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(29, 10))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(30,  0))!.attrs).toEqual(expectedAttrInfo);
        // Fifth `{@example}`.
        expect(csUtils.getInfo(doc, new Position(31,  5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(32, 10))!.attrs).toEqual(expectedAttrInfo);
      });
    });

    it('should extract attributes info when there is no indentation', () => {
      withBothQuotes(q => {
        const doc = createTextDocument(quote(q, `
          <code-example
          linenums=%true%
          path=%foo%
          region=%bar%
          header=%baz%>
          </code-example>

          {@example foo
          linenums=%true%
          region=%bar%
          header=%baz%
          }
          ${EOF_MARKER}
          0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                    012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
        `));
        const expectedAttrInfo: ICodeSnippetAttrInfo = {
          header: 'baz',
          linenums: true,
          path: 'foo',
          region: 'bar',
        };

        expect(csUtils.getInfo(doc, new Position(0, 5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(1, 5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(2, 5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(3, 5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(4, 5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(5, 5))!.attrs).toEqual(expectedAttrInfo);

        expect(csUtils.getInfo(doc, new Position( 7, 5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position( 8, 5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position( 9, 5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(10, 5))!.attrs).toEqual(expectedAttrInfo);
        expect(csUtils.getInfo(doc, new Position(11, 0))!.attrs).toEqual(expectedAttrInfo);
      });
    });

    it('should support the different type of quotes in attribute values', () => {
      const doc = createTextDocument(`
        <code-example path="file/pat.h" region="foo'bar" header='baz"qux'></code-example>
        {@example file/pat.h region="foo'bar" header='baz"qux'}
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);
      const expectedAttrInfo: Partial<ICodeSnippetAttrInfo> = {
        header: 'baz"qux',
        region: 'foo\'bar',
      };

      expect(csUtils.getInfo(doc, new Position(0,  5))!.attrs).toEqual(jasmine.objectContaining(expectedAttrInfo));
      expect(csUtils.getInfo(doc, new Position(0, 65))!.attrs).toEqual(jasmine.objectContaining(expectedAttrInfo));
      expect(csUtils.getInfo(doc, new Position(0, 72))!.attrs).toEqual(jasmine.objectContaining(expectedAttrInfo));

      expect(csUtils.getInfo(doc, new Position(1,  5))!.attrs).toEqual(jasmine.objectContaining(expectedAttrInfo));
      expect(csUtils.getInfo(doc, new Position(1, 47))!.attrs).toEqual(jasmine.objectContaining(expectedAttrInfo));
    });

    it('should give `header` attribute priority over `title`', () => {
      const doc = createTextDocument(`
        <code-example path="foo" region="bar" header="baz" title="qux"></code-example>
        {@example foo region="bar" header="baz" title="qux"}
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);
      const expectedAttrInfo: Partial<ICodeSnippetAttrInfo> = {
        header: 'baz',
      };

      expect(csUtils.getInfo(doc, new Position(0,  5))!.attrs).toEqual(jasmine.objectContaining(expectedAttrInfo));
      expect(csUtils.getInfo(doc, new Position(0, 62))!.attrs).toEqual(jasmine.objectContaining(expectedAttrInfo));
      expect(csUtils.getInfo(doc, new Position(0, 69))!.attrs).toEqual(jasmine.objectContaining(expectedAttrInfo));

      expect(csUtils.getInfo(doc, new Position(1,  5))!.attrs).toEqual(jasmine.objectContaining(expectedAttrInfo));
      expect(csUtils.getInfo(doc, new Position(1, 44))!.attrs).toEqual(jasmine.objectContaining(expectedAttrInfo));
    });

    it('should not require `linenums` to be specified', () => {
      const doc = createTextDocument(`
        <code-example path="foo" region="bar" header="baz"></code-example>
        {@example foo region="bar" header="baz"}
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);
      const expectedAttrInfo: ICodeSnippetAttrInfo = {
        header: 'baz',
        linenums: false,
        path: 'foo',
        region: 'bar',
      };

      expect(csUtils.getInfo(doc, new Position(0, 33))!.attrs).toEqual(expectedAttrInfo);
      expect(csUtils.getInfo(doc, new Position(1, 33))!.attrs).toEqual(expectedAttrInfo);
    });

    it('should correctly translate `linenums`', () => {
      const doc = createTextDocument(`
        <code-example linenums="false" path="foo"></code-example>
        <code-example linenums="true" path="foo"></code-example>
        <code-example linenums="bar" path="foo"></code-example>
        <code-example linenums="42" path="foo"></code-example>

        {@example linenums="false" foo}
        {@example linenums="true" foo}
        {@example linenums="bar" foo}
        {@example linenums="42" foo}
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);

      expect(csUtils.getInfo(doc, new Position(0, 33))!.attrs.linenums).toBe(false);
      expect(csUtils.getInfo(doc, new Position(1, 33))!.attrs.linenums).toBe(true);
      expect(csUtils.getInfo(doc, new Position(2, 33))!.attrs.linenums).toBe(false);
      expect(csUtils.getInfo(doc, new Position(3, 33))!.attrs.linenums).toBe(42);

      expect(csUtils.getInfo(doc, new Position(5, 23))!.attrs.linenums).toBe(false);
      expect(csUtils.getInfo(doc, new Position(6, 23))!.attrs.linenums).toBe(true);
      expect(csUtils.getInfo(doc, new Position(7, 23))!.attrs.linenums).toBe(false);
      expect(csUtils.getInfo(doc, new Position(8, 23))!.attrs.linenums).toBe(42);
    });

    it('should not require `region` to be specified', () => {
      const doc = createTextDocument(`
        <code-example linenums="true" path="foo" header="baz"></code-example>
        {@example linenums="true" foo header="baz"}
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);
      const expectedAttrInfo: ICodeSnippetAttrInfo = {
        header: 'baz',
        linenums: true,
        path: 'foo',
        region: null,
      };

      expect(csUtils.getInfo(doc, new Position(0, 33))!.attrs).toEqual(expectedAttrInfo);
      expect(csUtils.getInfo(doc, new Position(0, 33))!.attrs).toEqual(expectedAttrInfo);
    });

    it('should not require `header` to be specified', () => {
      const doc = createTextDocument(`
        <code-example linenums="true" path="foo" region="bar"></code-example>

        {@example linenums="true" foo region="bar"}
        {@example linenums="true" foo bar}
        ${EOF_MARKER}
        0123456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
                  012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      `);
      const expectedAttrInfo: ICodeSnippetAttrInfo = {
        header: null,
        linenums: true,
        path: 'foo',
        region: 'bar',
      };

      expect(csUtils.getInfo(doc, new Position(0, 33))!.attrs).toEqual(expectedAttrInfo);

      expect(csUtils.getInfo(doc, new Position(2, 23))!.attrs).toEqual(expectedAttrInfo);
      expect(csUtils.getInfo(doc, new Position(3, 13))!.attrs).toEqual(expectedAttrInfo);
    });
  });
});

describe('codeSnippetUtils', () => {
  it('should be a `CodeSnippetUtils` instance', () => {
    expect(codeSnippetUtils).toEqual(jasmine.any(CodeSnippetUtils));
  });
});
