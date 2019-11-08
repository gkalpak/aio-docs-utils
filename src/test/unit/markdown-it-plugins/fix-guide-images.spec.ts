import * as MarkdownIt from 'markdown-it';
import {fixGuideImagesPlugin} from '../../../markdown-it-plugins/fix-guide-images';
import {logger} from '../../../shared/logger';
import {isNgProjectWatcher} from '../../../shared/workspace-folder-watcher';
import {stripIndentation} from '../../helpers/string-utils';


type IImageMarkdownGenerator = (url: string) => string;

describe('fixGuideImagesPlugin()', () => {
  const markdownImageGenerators: IImageMarkdownGenerator[] = [
    // VSCode transforms relative URLs for previews.
    url => `![test image](vscode-resource:/absolute/path/to/${url})`,
  ];
  const htmlImageGenerators: IImageMarkdownGenerator[] = [
    url => `<img src="${url}" />`,
    url => `<img src='${url}' />`,
    url => `<img src=${url}>`,
    url => `<img   src="${url}"   />`,
  ];
  let md: MarkdownIt;
  let logSpy: jasmine.Spy;
  let matchesGetSpy: jasmine.Spy;

  beforeEach(() => {
    md = new MarkdownIt({html: true}).use(fixGuideImagesPlugin);
    logSpy = spyOn(logger, 'log');
    matchesGetSpy = spyOnProperty(isNgProjectWatcher, 'matches').and.returnValue(true);
  });

  markdownImageGenerators.forEach(imgMdGenerator => {
    const imgMatcher = (url: string) => matchImgHtmlForUrl(`vscode-resource:/absolute/path/to/${url}`);
    const mdGenerator: IImageMarkdownGenerator = url => stripIndentation(`
      Line before.

      ${imgMdGenerator(url)}

      Line after.
    `);

    describe(`(with images like: ${imgMdGenerator('test.url')})`, () => runTests(mdGenerator, imgMatcher));
  });

  htmlImageGenerators.forEach(imgMdGenerator => {
    const imgMatcher = matchImgHtmlForUrl;
    const mdGenerator: IImageMarkdownGenerator = url => stripIndentation(`
      Line before.

      ${imgMdGenerator(url)}

      Line after.
    `);

    describe(`(with images like: ${imgMdGenerator('test.url')})`, () => runTests(mdGenerator, imgMatcher));
  });

  htmlImageGenerators.forEach(imgMdGenerator => {
    const imgMatcher = matchImgHtmlForUrl;
    const mdGenerator: IImageMarkdownGenerator = url => stripIndentation(`
      Line before.

      <p>
        <figure>
          ${imgMdGenerator(url)}
        </figure>
      </p>

      Line after.
    `);

    describe(`(with images like: <p>...${imgMdGenerator('test.url')}...</p>)`, () => runTests(mdGenerator, imgMatcher));
  });

  // Helpers
  function matchImgHtmlForUrl(url: string): RegExp {
    const escapedUrl = url.replace(/\./g, '\\.');
    return new RegExp(`<img +src=(["']?)${escapedUrl}\\1(?: [^>]*)?>`);
  }

  function runTests(mdGenerator: IImageMarkdownGenerator, imgMatcher: (url: string) => RegExp): void {
    it('should rewrite image URLs pointing to `generated/images/`', () => {
      const urlSuffix = 'images/foo/bar.png';
      const inputUrl = `generated/${urlSuffix}`;
      const input = mdGenerator(inputUrl);
      const output = md.render(input);

      expect(output).not.toMatch(imgMatcher(inputUrl));
      expect(output).toMatch(imgMatcher(`../${urlSuffix}`));
    });

    it('should not rewrite image URLs pointing to other directories', () => {
      const urlSuffix = 'images/foo/bar.png';
      const inputUrl = `not-generated/${urlSuffix}`;
      const input = mdGenerator(inputUrl);
      const output = md.render(input);

      expect(output).toMatch(imgMatcher(inputUrl));
      expect(output).not.toMatch(imgMatcher(`../${urlSuffix}`));
    });

    it('should rewrite all occurrences', () => {
      const urlSuffix = 'images/foo/bar.png';
      const inputUrl = `generated/${urlSuffix}`;
      const input = mdGenerator(`${inputUrl}.1`) + mdGenerator(`${inputUrl}.2`);
      const output = md.render(input);

      expect(output).not.toMatch(imgMatcher(`${inputUrl}.1`));
      expect(output).not.toMatch(imgMatcher(`${inputUrl}.2`));
      expect(output).toMatch(imgMatcher(`../${urlSuffix}.1`));
      expect(output).toMatch(imgMatcher(`../${urlSuffix}.2`));
    });

    it('should log rewrites', () => {
      const urlSuffix = 'images/foo/bar.png';
      const inputUrl = `generated/${urlSuffix}`;
      const input = mdGenerator(`${inputUrl}.1`) + mdGenerator(`${inputUrl}.2`);
      md.render(input);

      expect(logSpy.calls.allArgs()).toEqual([
        [`Rewriting image URL in Markdown preview: ${inputUrl}.1 --> ../${urlSuffix}.1`],
        [`Rewriting image URL in Markdown preview: ${inputUrl}.2 --> ../${urlSuffix}.2`],
      ]);
    });

    it('should not rewrite image URLs if `isNgProjectWatcher.matches` is false', () => {
      matchesGetSpy.and.returnValue(false);

      const urlSuffix = 'images/foo/bar.png';
      const inputUrl = `generated/${urlSuffix}`;
      const input = mdGenerator(inputUrl);
      const output = md.render(input);

      expect(output).toMatch(imgMatcher(inputUrl));
      expect(output).not.toMatch(imgMatcher(`../${urlSuffix}`));
    });
  }
});
