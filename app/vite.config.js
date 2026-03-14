import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
	base: './',
	root: 'src',
	plugins: [vue()],
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
				theme: path.resolve(__dirname, 'src/apps/js/Theme.js'),
				'activity-log': path.resolve(__dirname, 'src/apps/js/ActivityLog.js'),
				'admin-notices': path.resolve(__dirname, 'src/apps/js/AdminNotices.js'),
				analytics: path.resolve(__dirname, 'src/apps/js/Analytics.js'),
				comments: path.resolve(__dirname, 'src/apps/js/Comments.js'),
				dashboard: path.resolve(__dirname, 'src/apps/js/Dashboard.js'),
				database: path.resolve(__dirname, 'src/apps/js/Database.js'),
				frontend: path.resolve(__dirname, 'src/apps/js/Frontend.js'),
				login: path.resolve(__dirname, 'src/apps/js/Login.js'),
				media: path.resolve(__dirname, 'src/apps/js/Media.js'),
				'menu-creator': path.resolve(__dirname, 'src/apps/js/MenuCreator.js'),
				plugins: path.resolve(__dirname, 'src/apps/js/Plugins.js'),
				posts: path.resolve(__dirname, 'src/apps/js/Posts.js'),
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