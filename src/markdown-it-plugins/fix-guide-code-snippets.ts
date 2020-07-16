import * as MarkdownIt from 'markdown-it';
import * as MarkdownItRenderer from 'markdown-it/lib/renderer';
import {logger} from '../shared/logger';
import {isNgProjectWatcher} from '../shared/workspace-folder-watcher';


export const fixGuideCodeSnippetsPlugin = (md: MarkdownIt): void => {
  const htmlBlockReplacers: {re: RegExp, replacer: (...args: string[]) => string}[] = [
    {
      re: /( *)<(code-example)(|\s[^>]*)>(?: *\n)*([^<]*)<\/\2>/g,
      replacer: (m: string, g1: string, g2: string, g3: string, g4: string) => {
        g4 = g4.replace(/\s+$/, '');
        const rewrittenHtml =
          `${g1}<pre>&lt;${g2}${rewriteAttrs(g3, g1)}&gt;\n` +
            `${g4 && `${g4}\n`}` +
          `${g1}&lt;/${g2}&gt;</pre>`;
        logRewrite(m, rewrittenHtml);
        return rewrittenHtml;
      },
    },
    {
      re: /( *)<(code-tabs)(|\s[^>]*)>([^]*?)<\/\2>/g,
      replacer: (m: string, g1: string, g2: string, g3: string, g4: string) => {
        const rewrittenHtml =
          `${g1}<pre>&lt;${g2}${rewriteAttrs(g3, g1)}&gt;\n` +
            processCodeTabsContent(g4) +
          `${g1}&lt;/${g2}&gt;</pre>`;
        logRewrite(m, rewrittenHtml);
        return rewrittenHtml;
      },
    },
  ];
  const htmlInlineReplacers: {re: RegExp, replacer: (...args: string[]) => string}[] = [
    {
      re: /^<((\/?)code-(?:example|tabs))(|\s[^>]*)>$/g,
      replacer: (m: string, g1: string, g2: string, g3: string) => {
        const rewrittenHtmlInner = `&lt;${g1}${rewriteAttrs(g3)}&gt;`;
        const rewrittenHtml = !g2 ? `<pre>${rewrittenHtmlInner}` : `\n${rewrittenHtmlInner}</pre>`;
        logRewrite(m, rewrittenHtml);
        return rewrittenHtml;
      },
    },
  ];

  const rendererRules = md.renderer.rules;
  const fallbackRender: MarkdownItRenderer.RenderRule =
    (tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options);

  // HTML block render.
  const originalHtmlBlockRender = rendererRules.html_block || fallbackRender;

  rendererRules.html_block = (tokens, idx, options, env, self) => {
    if (isNgProjectWatcher.matches) {
      const token = tokens[idx];
      token.content = htmlBlockReplacers.reduce((aggr, {re, replacer}) => aggr.replace(re, replacer), token.content);
    }

    return originalHtmlBlockRender(tokens, idx, options, env, self);
  };

  // HTML inline render.
  const originalHtmlInlineRender = rendererRules.html_inline || fallbackRender;

  rendererRules.html_inline = (tokens, idx, options, env, self) => {
    if (isNgProjectWatcher.matches) {
      const token = tokens[idx];
      token.content = htmlInlineReplacers.reduce((aggr, {re, replacer}) => aggr.replace(re, replacer), token.content);
    }

    return originalHtmlInlineRender(tokens, idx, options, env, self);
  };

  // Softbreak render.
  const originalSoftbreakRender = rendererRules.softbreak || fallbackRender;

  rendererRules.softbreak = (tokens, idx, options, env, self) => {
    const nextToken = tokens[idx + 1];
    return (isNgProjectWatcher.matches && nextToken && /^<\/code-(?:example|pane|tabs)[\s>]/.test(nextToken.content)) ?
      '' :
      originalSoftbreakRender(tokens, idx, options, env, self);
  };
};

// Helpers
function escapeNl(input: string): string {
  return input.replace(/\r?\n/g, '\\n');
}

function logRewrite(oldHtml: string, newHtml: string): void {
  logger.log(
    `Rewriting code-snippet HTML in Markdown preview: ${escapeNl(oldHtml.trim())} --> ${escapeNl(newHtml.trim())}`);
}

function processCodePane(_m: string, g1: string, g2: string, g3: string, g4: string): string {
  g4 = g4.replace(/\s+$/, '');
  const rewrittenHtml =
    `${g1}&lt;${g2}${rewriteAttrs(g3, g1)}&gt;\n` +
      `${g4 && `${g4}\n`}` +
    `${g1}&lt;/${g2}&gt;\n`;

  return rewrittenHtml;
}

function processCodeTabsContent(content: string): string {
  const codePaneRe = /(?: *\n)*( *)<(code-pane)(|\s[^>]*)>(?: *\n)*([^<]*)<\/\2>/g;
  let rewrittenHtml = '';

  for (let match = codePaneRe.exec(content); match !== null; match = codePaneRe.exec(content)) {
    const [m, g1, g2, g3, g4] = match;
    rewrittenHtml += processCodePane(m, g1, g2, g3, g4);
  }

  return rewrittenHtml;
}

function rewriteAttrs(attrs: string, indentation = ''): string {
  return attrs.
    replace(/(^|["'])\s+(?=\S|$)/g, `$1\n${indentation}    `).
    replace(/\s+$/, '').
    split('\n').
    sort().
    join('\n');
}
