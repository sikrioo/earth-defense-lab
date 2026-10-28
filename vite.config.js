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
      // fortress mode is the main page; the earlier game stays reachable as classic.html (site build only)
      rollupOptions: single ? {} : { input: { main: 'index.html', classic: 'classic.html' } },
      assetsInlineLimit: single ? 100_000_000 : 4096,
      chunkSizeWarningLimit: 2000,
    },
  };
});
