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
				'app-react': path.resolve(__dirname, 'src/react/main/app.tsx'),
				theme: path.resolve(__dirname, 'src/apps/js/Theme.js'),
				'activity-log': path.resolve(__dirname, 'src/apps/js/ActivityLog.js'),
				// React activity log; the Vue entry stays as the fallback behind the filter.
				'activity-log-react': path.resolve(__dirname, 'src/react/main/activity-log.tsx'),
				'admin-notices': path.resolve(__dirname, 'src/apps/js/AdminNotices.js'),
				// React admin notices; the Vue entry stays as the fallback behind the filter.
				'admin-notices-react': path.resolve(__dirname, 'src/react/main/admin-notices.tsx'),
				analytics: path.resolve(__dirname, 'src/apps/js/Analytics.js'),
				comments: path.resolve(__dirname, 'src/apps/js/Comments.js'),
				// React comments screen; the Vue entry stays as the fallback behind the filter.
				'comments-react': path.resolve(__dirname, 'src/react/main/comments.tsx'),
				dashboard: path.resolve(__dirname, 'src/apps/js/Dashboard.js'),
				'dashboard-react': path.resolve(__dirname, 'src/react/main/dashboard.tsx'),
				database: path.resolve(__dirname, 'src/apps/js/Database.js'),
				// React database explorer; the Vue entry stays as the fallback behind the filter.
				'database-react': path.resolve(__dirname, 'src/react/main/database.tsx'),
				'design-system': path.resolve(__dirname, 'src/react/main/design-system.tsx'),
				frontend: path.resolve(__dirname, 'src/apps/js/Frontend.js'),
				// React frontend bar; the Vue entry stays as the fallback behind the filter.
				'frontend-react': path.resolve(__dirname, 'src/react/main/frontend.tsx'),
				login: path.resolve(__dirname, 'src/apps/js/Login.js'),
				// React login screen; the Vue entry stays as the fallback behind the filter.
				'login-react': path.resolve(__dirname, 'src/react/main/login.tsx'),
				media: path.resolve(__dirname, 'src/apps/js/Media.js'),
				// React media screen; the Vue entry stays as the fallback behind the filter.
				'media-react': path.resolve(__dirname, 'src/react/main/media.tsx'),
				'menu-creator': path.resolve(__dirname, 'src/apps/js/MenuCreator.js'),
				// React menu builder; the Vue entry stays as the fallback behind the filter.
				'menu-creator-react': path.resolve(__dirname, 'src/react/main/menu-creator.tsx'),
				plugins: path.resolve(__dirname, 'src/apps/js/Plugins.js'),
				// React plugins screen; the Vue entry stays as the fallback behind the filter.
				'plugins-react': path.resolve(__dirname, 'src/react/main/plugins.tsx'),
				posts: path.resolve(__dirname, 'src/apps/js/Posts.js'),
				// React posts screen; the Vue entry stays as the fallback behind the filter.
				'posts-react': path.resolve(__dirname, 'src/react/main/posts.tsx'),
				products: path.resolve(__dirname, 'src/apps/js/Products.js'),
				// React catalog screen; the Vue entry stays until the product editor moves over.
				'products-react': path.resolve(__dirname, 'src/react/main/products.tsx'),
				orders: path.resolve(__dirname, 'src/apps/js/Orders.js'),
				// React orders screen; the Vue entry stays until the order editor moves over.
				'orders-react': path.resolve(__dirname, 'src/react/main/orders.tsx'),
				'role-editor': path.resolve(__dirname, 'src/apps/js/RoleEditor.js'),
				// React role editor; the Vue entry stays as the fallback behind the filter.
				'role-editor-react': path.resolve(__dirname, 'src/react/main/role-editor.tsx'),
				settings: path.resolve(__dirname, 'src/apps/js/Settings.js'),
				// React settings screen; the Vue entry stays as the fallback behind the filter.
				'settings-react': path.resolve(__dirname, 'src/react/main/settings.tsx'),
				users: path.resolve(__dirname, 'src/apps/js/Users.js'),
				// React users screen; the Vue entry stays as the fallback behind the filter.
				'users-react': path.resolve(__dirname, 'src/react/main/users.tsx'),
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