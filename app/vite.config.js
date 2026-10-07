import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
	base: './',
	root: 'src',
	plugins: [tailwindcss(), react({ include: '**/*.{ts,tsx}' })],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src'),
		},
	},
	build: {
		outDir: '../dist',
		assetsDir: 'assets',
		emptyOutDir: true,
		manifest: true,
		sourcemap: true,
		rollupOptions: {
			// One entry per admin screen. `theme` and `analytics` are plain JavaScript that runs
			// outside any app: one sets the colour scheme before anything renders, the other
			// records page views on the site itself.
			input: {
				theme: path.resolve(__dirname, 'src/apps/js/Theme.js'),
				analytics: path.resolve(__dirname, 'src/apps/js/Analytics.js'),
				app: path.resolve(__dirname, 'src/react/main/app.tsx'),
				'activity-log': path.resolve(__dirname, 'src/react/main/activity-log.tsx'),
				'admin-notices': path.resolve(__dirname, 'src/react/main/admin-notices.tsx'),
				comments: path.resolve(__dirname, 'src/react/main/comments.tsx'),
				dashboard: path.resolve(__dirname, 'src/react/main/dashboard.tsx'),
				database: path.resolve(__dirname, 'src/react/main/database.tsx'),
				'design-system': path.resolve(__dirname, 'src/react/main/design-system.tsx'),
				frontend: path.resolve(__dirname, 'src/react/main/frontend.tsx'),
				login: path.resolve(__dirname, 'src/react/main/login.tsx'),
				media: path.resolve(__dirname, 'src/react/main/media.tsx'),
				'menu-creator': path.resolve(__dirname, 'src/react/main/menu-creator.tsx'),
				orders: path.resolve(__dirname, 'src/react/main/orders.tsx'),
				plugins: path.resolve(__dirname, 'src/react/main/plugins.tsx'),
				posts: path.resolve(__dirname, 'src/react/main/posts.tsx'),
				products: path.resolve(__dirname, 'src/react/main/products.tsx'),
				'role-editor': path.resolve(__dirname, 'src/react/main/role-editor.tsx'),
				settings: path.resolve(__dirname, 'src/react/main/settings.tsx'),
				users: path.resolve(__dirname, 'src/react/main/users.tsx'),
			},
			output: {
				entryFileNames: '[name].build.[hash].js',
				chunkFileNames: 'assets/[name]-[hash].js',
				assetFileNames: (assetInfo) => {
					const name = assetInfo.name || '';

					if (name.endsWith('.css')) {
						if (name.includes('theme')) {
							return 'assets/styles/theme.css';
						}

						if (name.includes('app')) {
							return 'assets/styles/app.[hash][extname]';
						}

						return 'assets/styles/[name][extname]';
					}

					return 'assets/[name]-[hash][extname]';
				},
			},
		},
	},
});
