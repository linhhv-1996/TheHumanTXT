import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
    allowedHosts: [
      'da32-14-231-166-146.ngrok-free.app',
    ],
  },
});
