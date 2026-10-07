import { describe, expect, it, beforeEach } from 'vitest';
import { readWpData } from '@/react/lib/script-data';

const mainTag = (attributes: Record<string, string>) => {
	const script = document.createElement('script');
	script.id = 'fd-script';
	Object.entries(attributes).forEach(([key, value]) => script.setAttribute(key, value));
	document.body.appendChild(script);
};

beforeEach(() => {
	document.body.innerHTML = '';
});

describe('readWpData', () => {
	it('reads site and user data', () => {
		mainTag({
			'plugin-base': 'https://site.test/wp-content/plugins/flexify-dashboard/',
			'rest-base': 'https://site.test/wp-json/',
			'rest-nonce': 'nonce123',
			'user-id': '7',
			'user-name': 'Maria',
			'user-roles': '["administrator"]',
			'can-manage-options': 'true',
			'flexify-dashboard-settings': '{"use_modern_orders_page":true}',
		});

		const wp = readWpData();

		expect(wp.userId).toBe(7);
		expect(wp.userName).toBe('Maria');
		expect(wp.userRoles).toEqual(['administrator']);
		expect(wp.canManageOptions).toBe(true);
		expect(wp.settings.use_modern_orders_page).toBe(true);
	});

	it('falls back when attributes are missing or invalid', () => {
		mainTag({ 'user-roles': 'not json' });

		const wp = readWpData();

		expect(wp.userRoles).toEqual([]);
		expect(wp.userId).toBe(0);
		expect(wp.canManageOptions).toBe(false);
		expect(wp.page).toEqual({});
	});

	it('merges capabilities into the user and removes them from the DOM', () => {
		mainTag({ 'current-user': '{"id":7,"name":"Maria"}', 'user-allcaps': '{"edit_shop_orders":true}' });

		const wp = readWpData();

		expect(wp.currentUser?.allcaps?.edit_shop_orders).toBe(true);
		expect(document.querySelector('#fd-script')?.hasAttribute('user-allcaps')).toBe(false);
	});

	it('reads the payload of the page script tag', () => {
		mainTag({ 'rest-base': 'https://site.test/wp-json/' });

		const page = document.createElement('script');
		page.id = 'fd-woocommerce-script';
		page.setAttribute('woocommerce-data', '{"active":true,"hpos":true}');
		page.setAttribute('supports_categories', '1');
		document.body.appendChild(page);

		const wp = readWpData('#fd-script', '#fd-woocommerce-script');

		expect(wp.page.woocommerce).toEqual({ active: true, hpos: true });
		expect(wp.page.supportsCategories).toBe(true);
	});
});
