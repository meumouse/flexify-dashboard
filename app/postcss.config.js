import scopeLayers from './build/postcss-scope-layers.js';

export default {
	plugins: [
		scopeLayers({
			'fd-isolation-scope': {
				layer: 'fd-isolation',
				prefix: ':where(.flexify-dashboard-isolation)',
			},
			'fd-theme-scope': {
				layer: 'fd-theme',
				prefix: '#fd-body-holder',
			},
		}),
	],
};
