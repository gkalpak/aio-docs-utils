import * as MarkdownIt from 'markdown-it';
import {fixGuideCodeSnippetsPlugin} from '../../../markdown-it-plugins/fix-guide-code-snippets';
import {logger} from '../../../shared/logger';
import {isNgProjectWatcher} from '../../../shared/workspace-folder-watcher';
import {stripIndentation} from '../../helpers/string-utils';


interface ICodeSnippetMarkdownGenerator {
  desc: string;
  extraIndentation: string;
  generator: (codeSnippet: string) => string;
}

describe('fixGuideCodeSnippetsPlugin()', () => {
  const codeSnippetGenerators: ICodeSnippetMarkdownGenerator[] = [
    {
      desc: 'top-level code-snippet',
      extraIndentation: ' '.repeat(0),
      generator: codeSnippet => stripIndentation(`
        Line before.

        ${indentBlock(codeSnippet, ' '.repeat(8), 1)}

        Line after.
      `),
    },
    {
      desc: 'nested code-snippet',
      extraIndentation: ' '.repeat(2),
      generator: codeSnippet => stripIndentation(`
        Line before.

        <div>
          ${indentBlock(codeSnippet, ' '.repeat(10), 1)}
        </div>

        Line after.
      `),
    },
  ];
  let md: MarkdownIt;
  let logSpy: jasmine.Spy;
  let matchesGetSpy: jasmine.Spy;

  beforeEach(() => {
    md = new MarkdownIt({html: true}).use(fixGuideCodeSnippetsPlugin);
    logSpy = spyOn(logger, 'log');
    matchesGetSpy = spyOnProperty(isNgProjectWatcher, 'matches').and.returnValue(true);
  });

  codeSnippetGenerators.forEach(({desc: generatorDesc, extraIndentation, generator: mdGenerator}) => {
    // Helpers
    const assertNotTransformed = (inputSnippet: string) => {
      const snippet = stripIndentation(inputSnippet);
      const input = mdGenerator(snippet);
      const output = md.render(input);

      expect(output).toContain(indentBlock(snippet, extraIndentation, 1));
    };
    const assertTransformed = (inputSnippet: string, ...outputSnippets: string[]) => {
      const snippet = stripIndentation(inputSnippet);
      const input = mdGenerator(snippet);
      const output = md.render(input);

      expect(output).not.toContain(indentBlock(snippet, extraIndentation, 1));

      outputSnippets.forEach(outputSnippet =>
        expect(output).toContain(transformCodeSnippetToHtml(outputSnippet, extraIndentation)));
    };

    describe(`(with ${generatorDesc})`, () => {
      it('should rewrite single-line `<code-example>` occurrences', () => {
        assertTransformed(
          `
            <code-example header="Sample" path="/path/to/samp.le"></code-example>
          `, `
            <code-example
                header="Sample"
                path="/path/to/samp.le">
            </code-example>
          `);
      });

      it('should rewrite multi-line `<code-example>` occurrences', () => {
        assertTransformed(
          `
            <code-example header="Sample"
                path="/path/to/samp.le"
              region="sample-region"></code-example>
          `, `
            <code-example
                header="Sample"
                path="/path/to/samp.le"
                region="sample-region">
            </code-example>
          `);
      });

      it('should correctly handle a line-break before the closing `</code-example>` tag', () => {
        assertTransformed(
          `
            <code-example path="/path/to/samp.le">
            </code-example>
          `, `
            <code-example
                path="/path/to/samp.le">
            </code-example>
          `);
      });

      it('should order `<code-example>` attributes alphabetically', () => {
        assertTransformed(
          `
            <code-example path="/path/to/samp.le" region="sample-region" header="Sample">
            </code-example>
          `, `
            <code-example
                header="Sample"
                path="/path/to/samp.le"
                region="sample-region">
            </code-example>
          `);
      });

      it('should rewrite all `<code-example>` occurrences', () => {
        assertTransformed(
          `
            <code-example path="/path/to/samp.le.1" region="sample-region-1" header="Sample 1">
            </code-example>
            A line between.
            <code-example
              path="/path/to/samp.le.2"
                region="sample-region-2"
                  header="Sample 2"
                    ></code-example>
          `, `
            <code-example
                header="Sample 1"
                path="/path/to/samp.le.1"
                region="sample-region-1">
            </code-example>
          `, `
            <code-example
                header="Sample 2"
                path="/path/to/samp.le.2"
                region="sample-region-2">
            </code-example>
          `);
      });

      it('should not rewrite `<code-example>` occurrences if `isNgProjectWatcher.matches` is false', () => {
        matchesGetSpy.and.returnValue(false);

        assertNotTransformed(`
          <code-example path="/path/to/samp.le.1"></code-example>
        `);

        assertNotTransformed(`
          <code-example path="/path/to/samp.le.1">
          </code-example>
        `);

        assertNotTransformed(`
          <code-example
            path="/path/to/samp.le.1">
          </code-example>
        `);
      });

      it('should correctly handle content inside a `<code-example>`', () => {
        assertTransformed(
          `
            <code-example path="/path/to/samp.le">
              class Foo {
                bar = true;
              }
            </code-example>
          `, `
            <code-example
                path="/path/to/samp.le">
              class Foo {
                bar = true;
              }
            </code-example>
          `);
      });

      it('should rewrite `<code-tabs>` with single-line `<code-pane>` occurrences', () => {
        assertTransformed(
          `
            <code-tabs>
              <code-pane header="Sample 1" path="/path/to/samp.le.1"></code-pane>
              <code-pane header="Sample 2" path="/path/to/samp.le.2"></code-pane>
            </code-tabs>
          `, `
            <code-tabs>
              <code-pane
                  header="Sample 1"
                  path="/path/to/samp.le.1">
              </code-pane>
              <code-pane
                  header="Sample 2"
                  path="/path/to/samp.le.2">
              </code-pane>
            </code-tabs>
          `);
      });

      it('should rewrite `<code-tabs>` with multi-line `<code-pane>` occurrences', () => {
        assertTransformed(
          `
            <code-tabs>
              <code-pane header="Sample 1"
                  path="/path/to/samp.le.1"
                region="sample-region-1"></code-pane>
              <code-pane header="Sample 2" path="/path/to/samp.le.2" region="sample-region-2">
              </code-pane>
            </code-tabs>
          `, `
            <code-tabs>
              <code-pane
                  header="Sample 1"
                  path="/path/to/samp.le.1"
                  region="sample-region-1">
              </code-pane>
              <code-pane
                  header="Sample 2"
                  path="/path/to/samp.le.2"
                  region="sample-region-2">
              </code-pane>
            </code-tabs>
          `);
      });

      it('should order `<code-pane>` attributes alphabetically', () => {
        assertTransformed(
          `
            <code-tabs>
              <code-pane path="/path/to/samp.le" region="sample-region" header="Sample">
              </code-pane>
            </code-tabs>
          `, `
            <code-tabs>
              <code-pane
                  header="Sample"
                  path="/path/to/samp.le"
                  region="sample-region">
              </code-pane>
            </code-tabs>
          `);
      });

      it('should rewrite all `<code-tabs` occurrences', () => {
        assertTransformed(
          `
            <code-tabs>
              <code-pane path="/path/to/samp.le.1"></code-pane>
            </code-tabs>
            A line between.
            <code-tabs>
              <code-pane path="/path/to/samp.le.2"></code-pane>
                </code-tabs>
          `, `
            <code-tabs>
              <code-pane
                  path="/path/to/samp.le.1">
              </code-pane>
            </code-tabs>
          `, `
            <code-tabs>
              <code-pane
                  path="/path/to/samp.le.2">
              </code-pane>
            </code-tabs>
          `);
      });

      it('should not rewrite `<code-tabs>` occurrences if `isNgProjectWatcher.matches` is false', () => {
        matchesGetSpy.and.returnValue(false);

        assertNotTransformed(`
          <code-tabs>
            <code-pane path="/path/to/samp.le"></code-pane>
          </code-tabs>
        `);

        assertNotTransformed(`
          <code-tabs>
            <code-pane path="/path/to/samp.le">
            </code-pane>
          </code-tabs>
        `);

        assertNotTransformed(`
          <code-tabs linenums="true">
            <code-pane path="/path/to/samp.le"></code-pane>
          </code-tabs>
        `);
      });

      it('should correctly handle content inside a `<code-pane>`', () => {
        assertTransformed(
          `
            <code-tabs>
              <code-pane path="/path/to/samp.le.1">
                class Foo {
                  bar = true;
                }
              </code-pane>
              <code-pane
                  path="/path/to/samp.le.2">
                class Foo {
                  bar = true;
                }
              </code-pane>
            </code-tabs>
          `, `
            <code-tabs>
              <code-pane
                  path="/path/to/samp.le.1">
                class Foo {
                  bar = true;
                }
              </code-pane>
              <code-pane
                  path="/path/to/samp.le.2">
                class Foo {
                  bar = true;
                }
              </code-pane>
            </code-tabs>
          `);
      });

      it('should ignore `<code-tabs>` content other than `<code-pane>` occurrences', () => {
        assertTransformed(
          `
            <code-tabs>
              Not a code-pane.
              <code-pane path="/path/to/samp.le.1"></code-pane>
              Not a code-pane either.
              <code-pane path="/path/to/samp.le.2"></code-pane>
              Still not a code-pane.
            </code-tabs>
          `, `
            <code-tabs>
              <code-pane
                  path="/path/to/samp.le.1">
              </code-pane>
              <code-pane
                  path="/path/to/samp.le.2">
              </code-pane>
            </code-tabs>
          `);
      });
    });
  });

  it('should log rewrites', () => {
    const {desc: generatorDesc, extraIndentation, generator: mdGenerator} = codeSnippetGenerators[0];
    const transformForOutput = (outputish: string) =>
      indentBlock(stripIndentation(escapeAngularBrackets(outputish)), extraIndentation).trim().replace(/\n/g, '\\n');

    md.render(mdGenerator(stripIndentation(`
      <code-example path="/path/to/samp.le.1" header="Sample 1"></code-example>
    `)));

    expect(logSpy.calls.allArgs()).toEqual([
      [
        'Rewriting code-snippet HTML in Markdown preview: ' +
        '<code-example path="/path/to/samp.le.1" header="Sample 1"> --> ' +
        `<pre>${transformForOutput(`
          <code-example
              header="Sample 1"
              path="/path/to/samp.le.1">
        `)}`,
      ],
      ['Rewriting code-snippet HTML in Markdown preview: </code-example> --> &lt;/code-example&gt;</pre>'],
    ], `<code-example> inline HTML (${generatorDesc})`);

    logSpy.calls.reset();

    md.render(mdGenerator(stripIndentation(`
      <code-example path="/path/to/samp.le.2" header="Sample 2">
      </code-example>
    `)));

    expect(logSpy.calls.allArgs()).toEqual([
      [
        'Rewriting code-snippet HTML in Markdown preview: ' +
        '<code-example path="/path/to/samp.le.2" header="Sample 2">\\n</code-example> --> ' +
        `<pre>${transformForOutput(`
          <code-example
              header="Sample 2"
              path="/path/to/samp.le.2">
          </code-example>
        `)}</pre>`,
      ],
    ], `<code-example> block HTML (${generatorDesc})`);

    logSpy.calls.reset();

    md.render(mdGenerator(stripIndentation(`
      <code-tabs>
        <code-pane path="/path/to/samp.le.3" header="Sample 3">
        </code-pane>
      </code-tabs>
    `)));

    expect(logSpy.calls.allArgs()).toEqual([
      [
        'Rewriting code-snippet HTML in Markdown preview: ' +
        '<code-tabs>\\n  <code-pane path="/path/to/samp.le.3" header="Sample 3">\\n  </code-pane>\\n</code-tabs> --> ' +
        `<pre>${transformForOutput(`
          <code-tabs>
            <code-pane
                header="Sample 3"
                path="/path/to/samp.le.3">
            </code-pane>
          </code-tabs>
        `)}</pre>`,
      ],
    ], `<code-tabs> block HTML (${generatorDesc})`);
  });

  // Helpers
  function escapeAngularBrackets(input: string): string {
    return input.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function indentBlock(block: string, indentation: string, startAtLine = 0): string {
    return block.
      split('\n').
      map((line, i) => (i < startAtLine) ? line : `${indentation}${line}`).
      join('\n');
  }

  function transformCodeSnippetToHtml(codeSnippet: string, extraIndentation: string): string {
    const escapedCodeSnippet = escapeAngularBrackets(codeSnippet);
    const wrappedCodeSnippet = `<pre>${stripIndentation(escapedCodeSnippet)}</pre>`;
    return indentBlock(wrappedCodeSnippet, extraIndentation);
  }
});
