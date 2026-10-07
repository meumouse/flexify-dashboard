import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src'),
		},
	},
	test: {
		environment: 'jsdom',
		globals: true,
		include: ['src/react/**/*.test.{ts,tsx}'],
		setupFiles: ['./tests/setup-react.ts'],
		css: false,
	},
});
