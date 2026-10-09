import { describe, expect, it } from 'vitest';
import { filterMenu, normaliseLabel } from '@/react/shell/menu/filterMenu';
import { DEFAULT_WIDTH, MAX_WIDTH, MIN_WIDTH, clampSidebarWidth } from '@/react/shell/menu/useSidebarWidth';
import type { MenuItem } from '@/react/shell/menu/types';

const MENU: MenuItem[] = [
	{ id: 'dashboard', name: 'Painel', url: 'index.php' },
	{ id: 'sep-1', type: 'separator', settings: { name: 'Loja' } },
	{
		id: 'woocommerce',
		name: 'WooCommerce <span class="awaiting-mod">3</span>',
		url: 'admin.php?page=wc-admin',
		submenu: [
			{ id: 'orders', name: 'Pedidos', url: 'admin.php?page=wc-orders' },
			{ id: 'settings-woo', name: 'Configurações', url: 'admin.php?page=wc-settings' },
		],
	},
	{ id: 'settings', name: 'Configurações', url: 'options-general.php', submenu: [{ id: 'general', name: 'Geral', url: 'options-general.php' }] },
	{ id: 'hidden', name: 'Oculto', url: 'x.php', settings: { hidden: true } },
];

describe('menu filter', () => {
	it('reads names without markup, case or accents', () => {
		expect(normaliseLabel('Configurações <span class="count">2</span>')).toBe('configuracoes 2');
	});

	it('keeps every sub-item of a parent whose own name matches', () => {
		const result = filterMenu(MENU, 'woo');

		expect(result.map((item) => item.id)).toEqual(['woocommerce']);
		expect(result[0].submenu?.map((entry) => entry.id)).toEqual(['orders', 'settings-woo']);
	});

	it('keeps a parent for the sub-items that match, opened, and finds them without accents', () => {
		const result = filterMenu(MENU, 'configuracoes');

		expect(result.map((item) => item.id)).toEqual(['woocommerce', 'settings']);
		expect(result[0].submenu?.map((entry) => entry.id)).toEqual(['settings-woo']);
		expect(result[0].open).toBe(true);
	});

	it('drops separators, headings and hidden items while filtering, and leaves the menu alone without a query', () => {
		expect(filterMenu(MENU, 'o').some((item) => item.type === 'separator' || item.id === 'hidden')).toBe(false);
		expect(filterMenu(MENU, '  ')).toBe(MENU);
	});
});

describe('sidebar width', () => {
	it('holds a dragged width between the bounds and falls back on nonsense', () => {
		expect(clampSidebarWidth(100)).toBe(MIN_WIDTH);
		expect(clampSidebarWidth(1000)).toBe(MAX_WIDTH);
		expect(clampSidebarWidth(301.6)).toBe(302);
		expect(clampSidebarWidth(Number.NaN)).toBe(DEFAULT_WIDTH);
	});
});
