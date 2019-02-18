import * as MarkdownIt from 'markdown-it';
import {logger} from '../shared/logger';


export const IMG_URL_PREFIX = '../../src/';

export const fixGuideImagesPlugin = (md: MarkdownIt): void => {
  const imgReMd = /(\/)(generated\/images\/.+)$/;
  const imgReHtml = /(<img +src=["']?)(generated\/images\/[^"' >]+)/g;
  const imgReplacer = (m: string, g1: string, g2: string) => {
    logger.log(`Rewriting image URL in Markdown preview: ${g2} --> ${IMG_URL_PREFIX}${g2}`);
    return `${g1}${IMG_URL_PREFIX}${g2}`;
  };

  const fallbackRender: MarkdownIt.TokenRender = (tokens, idx, options, env, self) => self.render(tokens, idx, options);
  const rendererRules = md.renderer.rules;

  // HTML block/inline render. (Example: `<img src="..." />`)
  ['html_block', 'html_inline'].forEach(ruleName => {
    const originalRender = rendererRules[ruleName] || fallbackRender;

    rendererRules[ruleName] = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      token.content = token.content.replace(imgReHtml, imgReplacer);

      return originalRender(tokens, idx, options, env, self);
    };
  });

  // Markdown image render. (Example: `![...](...)`)
  const originalImageRender = rendererRules.image || fallbackRender;

  rendererRules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const srcAttr = token.attrs[token.attrIndex('src')];

    if (srcAttr) {
      srcAttr[1] = srcAttr[1].replace(imgReMd, imgReplacer);
    }

    return originalImageRender(tokens, idx, options, env, self);
  };
};
