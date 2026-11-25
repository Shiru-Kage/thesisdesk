import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs still resolve in production builds.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const baseDir = import.meta.dirname || path.resolve('.');
          const distDir = path.resolve(baseDir, 'dist');
          const srcAssets = path.resolve(baseDir, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            try {
              fs.mkdirSync(path.dirname(distAssets), { recursive: true });
              fs.cpSync(srcAssets, distAssets, { recursive: true, force: true });
            } catch (e) {
              console.warn('Failed to copy src/assets to dist/src/assets', e);
            }
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.', '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 2000,
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
  };
});
