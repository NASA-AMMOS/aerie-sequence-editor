import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/kit/vite';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: { adapter: adapter(), paths: { base: '/aerie-sequence-editor' } },
  preprocess: vitePreprocess(),
};

export default config;
