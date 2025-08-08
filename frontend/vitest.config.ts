import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'happy-dom', // Use happy-dom instead of jsdom for better Svelte 5 support
    globals: true,
    setupFiles: ['src/test-setup.ts'],
  },
});