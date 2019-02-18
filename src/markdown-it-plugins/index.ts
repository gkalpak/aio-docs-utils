import * as MarkdownIt from 'markdown-it';
import {fixGuideImagesPlugin} from './fix-guide-images';


const PLUGINS = [
  fixGuideImagesPlugin,
];

export const extendMarkdownIt = (md: MarkdownIt): MarkdownIt => PLUGINS.reduce((aggr, plugin) => aggr.use(plugin), md);
