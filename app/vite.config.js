import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
	base: './',
	root: 'src',
	// React only handles the TypeScript sources under src/react; the Vue code keeps using plugin-vue.
	plugins: [tailwindcss(), vue(), react({ include: '**/*.{ts,tsx}' })],
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
			input: {
				app: path.resolve(__dirname, 'src/apps/js/flexify-dashboard.js'),
				// React shell; the Vue entry stays until the search and the notifications move over.
				'app-react': path.resolve(__dirname, 'src/react/main/app.tsx'),
				theme: path.resolve(__dirname, 'src/apps/js/Theme.js'),
				'activity-log': path.resolve(__dirname, 'src/apps/js/ActivityLog.js'),
				'admin-notices': path.resolve(__dirname, 'src/apps/js/AdminNotices.js'),
				analytics: path.resolve(__dirname, 'src/apps/js/Analytics.js'),
				comments: path.resolve(__dirname, 'src/apps/js/Comments.js'),
				dashboard: path.resolve(__dirname, 'src/apps/js/Dashboard.js'),
				// React store overview; the Vue dashboard keeps the card registry until it moves over.
				'dashboard-react': path.resolve(__dirname, 'src/react/main/dashboard.tsx'),
				database: path.resolve(__dirname, 'src/apps/js/Database.js'),
				'design-system': path.resolve(__dirname, 'src/react/main/design-system.tsx'),
				frontend: path.resolve(__dirname, 'src/apps/js/Frontend.js'),
				login: path.resolve(__dirname, 'src/apps/js/Login.js'),
				media: path.resolve(__dirname, 'src/apps/js/Media.js'),
				'menu-creator': path.resolve(__dirname, 'src/apps/js/MenuCreator.js'),
				plugins: path.resolve(__dirname, 'src/apps/js/Plugins.js'),
				posts: path.resolve(__dirname, 'src/apps/js/Posts.js'),
				products: path.resolve(__dirname, 'src/apps/js/Products.js'),
				// React catalog screen; the Vue entry stays until the product editor moves over.
				'products-react': path.resolve(__dirname, 'src/react/main/products.tsx'),
				orders: path.resolve(__dirname, 'src/apps/js/Orders.js'),
				// React orders screen; the Vue entry stays until the order editor moves over.
				'orders-react': path.resolve(__dirname, 'src/react/main/orders.tsx'),
				'role-editor': path.resolve(__dirname, 'src/apps/js/RoleEditor.js'),
				settings: path.resolve(__dirname, 'src/apps/js/Settings.js'),
				users: path.resolve(__dirname, 'src/apps/js/Users.js'),
			},
			output: {
				entryFileNames: '[name].build.[hash].js',
				chunkFileNames: 'assets/[name]-[hash].js',
				assetFileNames: (assetInfo) => {
					const name = assetInfo.name || '';

					if (name.endsWith('.css')) {
						if ( name.includes('theme') ) {
							return 'assets/styles/theme.css';
						}

						if ( name.includes('app') ) {
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