import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: { minify: true },
  css: { devSourcemap: true },
  plugins: [sveltekit()],
  resolve: { alias: { stream: 'stream-browserify' } },
  server: { fs: { allow: ['..'] } },
  test: { include: ['src/**/*.{test,spec}.{js,ts}'] },
});
