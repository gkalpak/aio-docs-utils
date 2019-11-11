import * as MarkdownIt from 'markdown-it';
import {logger} from '../shared/logger';
import {isNgProjectWatcher} from '../shared/workspace-folder-watcher';


export const fixGuideImagesPlugin = (md: MarkdownIt): void => {
  const imgReMd = /(\/)generated\/(images\/.+)$/;
  const imgReHtml = /(<img +src=["']?)generated\/(images\/[^"' >]+)/g;
  const imgReplacer = (_m: string, g1: string, g2: string) => {
    const originalUrl = `generated/${g2}`;
    const rewrittenUrl = `../${g2}`;
    logger.log(`Rewriting image URL in Markdown preview: ${originalUrl} --> ${rewrittenUrl}`);
    return `${g1}${rewrittenUrl}`;
  };

  const rendererRules = md.renderer.rules as {[name: string]: MarkdownIt.FixedTokenRender};
  const fallbackRender: MarkdownIt.FixedTokenRender =
    (tokens, idx, options, _env, self) => self.render(tokens, idx, options);

  // HTML block/inline render. (Example: `<img src="..." />`)
  ['html_block', 'html_inline'].forEach(ruleName => {
    const originalRender = rendererRules[ruleName] || fallbackRender;

    rendererRules[ruleName] = (tokens, idx, options, env, self) => {
      if (isNgProjectWatcher.matches) {
        const token = tokens[idx];
        token.content = token.content.replace(imgReHtml, imgReplacer);
      }

      return originalRender(tokens, idx, options, env, self);
    };
  });

  // Markdown image render. (Example: `![...](...)`)
  const originalImageRender = rendererRules.image || fallbackRender;

  rendererRules.image = (tokens, idx, options, env, self) => {
    if (isNgProjectWatcher.matches) {
      const token = tokens[idx];
      const srcAttr = token.attrs[token.attrIndex('src')];

      if (srcAttr) {
        srcAttr[1] = srcAttr[1].replace(imgReMd, imgReplacer);
      }
    }

    return originalImageRender(tokens, idx, options, env, self);
  };
};
