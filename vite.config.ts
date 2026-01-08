import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypePrismPlus from 'rehype-prism-plus';

export default defineConfig({
  plugins: [
    mdx({
      remarkPlugins: [remarkGfm, remarkMath],
      rehypePlugins: [rehypeKatex, [rehypePrismPlus, { ignoreMissing: true }]],
      providerImportSource: '@mdx-js/react',
    }),
    react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
  ],
});
