import * as MarkdownIt from 'markdown-it';
import {fixGuideCodeSnippetsPlugin} from './fix-guide-code-snippets';
import {fixGuideImagesPlugin} from './fix-guide-images';


const PLUGINS = [
  fixGuideCodeSnippetsPlugin,
  fixGuideImagesPlugin,
];

export const extendMarkdownIt = (md: MarkdownIt): MarkdownIt => PLUGINS.reduce((aggr, plugin) => aggr.use(plugin), md);
