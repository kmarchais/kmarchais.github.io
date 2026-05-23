import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypePrismPlus from 'rehype-prism-plus';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    mdx({
      remarkPlugins: [remarkGfm, remarkMath],
      rehypePlugins: [rehypeKatex, [rehypePrismPlus, { ignoreMissing: true }]],
      providerImportSource: '@mdx-js/react',
    }),
    react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Three.js ecosystem
          'vendor-three': ['three'],
          // React Three Fiber
          'vendor-r3f': [
            '@react-three/fiber',
            '@react-three/drei',
          ],
          // UI animation
          'vendor-ui': ['framer-motion'],
          // MDX and math rendering
          'vendor-mdx': [
            '@mdx-js/react',
            'katex',
          ],
        },
      },
    },
    // three.js alone is ~720 kB; manualChunks already isolates it so the
    // size is intentional. Raise the warning floor above that.
    chunkSizeWarningLimit: 800,
  },
});
