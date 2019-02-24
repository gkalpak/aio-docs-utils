import * as MarkdownIt from 'markdown-it';
import {fixGuideImagesPlugin, IMG_URL_PREFIX} from '../../../markdown-it-plugins/fix-guide-images';
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
      const url = 'generated/images/foo/bar.png';
      const input = mdGenerator(url);
      const output = md.render(input);

      expect(output).not.toMatch(imgMatcher(url));
      expect(output).toMatch(imgMatcher(`${IMG_URL_PREFIX}${url}`));
    });

    it('should not rewrite image URLs pointing to other directories', () => {
      const url = 'not-generated/images/foo/bar.png';
      const input = mdGenerator(url);
      const output = md.render(input);

      expect(output).toMatch(imgMatcher(url));
      expect(output).not.toMatch(imgMatcher(`${IMG_URL_PREFIX}${url}`));
    });

    it('should rewrite all occurrences', () => {
      const url = 'generated/images/foo/bar.png';
      const input = mdGenerator(`${url}.1`) + mdGenerator(`${url}.2`);
      const output = md.render(input);

      expect(output).not.toMatch(imgMatcher(`${url}.1`));
      expect(output).not.toMatch(imgMatcher(`${url}.2`));
      expect(output).toMatch(imgMatcher(`${IMG_URL_PREFIX}${url}.1`));
      expect(output).toMatch(imgMatcher(`${IMG_URL_PREFIX}${url}.2`));
    });

    it('should log rewrites', () => {
      const url = 'generated/images/foo/bar.png';
      const input = mdGenerator(`${url}.1`) + mdGenerator(`${url}.2`);
      md.render(input);

      expect(logSpy.calls.allArgs()).toEqual([
        [`Rewriting image URL in Markdown preview: ${url}.1 --> ${IMG_URL_PREFIX}${url}.1`],
        [`Rewriting image URL in Markdown preview: ${url}.2 --> ${IMG_URL_PREFIX}${url}.2`],
      ]);
    });

    it('should not rewrite image URLs if `isNgProjectWatcher.matches` is false', () => {
      matchesGetSpy.and.returnValue(false);

      const url = 'generated/images/foo/bar.png';
      const input = mdGenerator(url);
      const output = md.render(input);

      expect(output).toMatch(imgMatcher(url));
      expect(output).not.toMatch(imgMatcher(`${IMG_URL_PREFIX}${url}`));
    });
  }
});
