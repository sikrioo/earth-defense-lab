import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`         -> dist/        normal site (GitHub Pages)
// `npm run build:single`  -> dist-single/ one self-contained index.html (offline, open from disk)
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    plugins: single ? [viteSingleFile()] : [],
    build: {
      outDir: single ? 'dist-single' : 'dist',
      assetsInlineLimit: single ? 100_000_000 : 4096,
      chunkSizeWarningLimit: 2000,
    },
  };
});
