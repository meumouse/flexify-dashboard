import { describe, expect, it } from 'vitest';
import { findItem, idAt, moveItem, removeItem, restoreMissing, updateItem } from '@/react/features/menus/menuEdits';
import type { MenuItem } from '@/react/shell/menu/types';

/** Rearranging a menu, checked apart from how it is drawn. */

const menu = (): MenuItem[] => [
	{ id: 'dashboard', name: 'Painel', submenu: [{ id: 'home', name: 'Início', url: 'index.php' }] },
	{ id: 'posts', name: 'Posts', submenu: [] },
	{ id: 'media', name: 'Mídia', submenu: [] },
];

describe('finding an item', () => {
	it('finds one at either level', () => {
		expect(findItem(menu(), 'posts')).toEqual({ parent: 1, child: null });
		expect(findItem(menu(), 'home')).toEqual({ parent: 0, child: 0 });
		expect(findItem(menu(), 'nothing')).toBeNull();
	});

	it('says what sits at a position', () => {
		expect(idAt(menu(), { parent: 2, child: null })).toBe('media');
		expect(idAt(menu(), { parent: 0, child: 0 })).toBe('home');
		expect(idAt(menu(), { parent: 9, child: null })).toBeUndefined();
	});
});

describe('moving an item', () => {
	it('moves a top-level item past its neighbour', () => {
		expect(moveItem(menu(), { parent: 1, child: null }, -1).map((item) => item.id)).toEqual(['posts', 'dashboard', 'media']);
	});

	it('leaves the menu alone at the ends', () => {
		expect(moveItem(menu(), { parent: 0, child: null }, -1).map((item) => item.id)).toEqual(['dashboard', 'posts', 'media']);
		expect(moveItem(menu(), { parent: 2, child: null }, 1).map((item) => item.id)).toEqual(['dashboard', 'posts', 'media']);
	});

	it('moves a child within the item it belongs to', () => {
		const items = menu();
		items[0].submenu = [
			{ id: 'home', name: 'Início', url: '' },
			{ id: 'updates', name: 'Atualizações', url: '' },
		];

		expect(moveItem(items, { parent: 0, child: 1 }, -1)[0].submenu?.map((entry) => entry.id)).toEqual(['updates', 'home']);
	});
});

describe('changing an item', () => {
	it('changes only the one asked for', () => {
		const changed = updateItem(menu(), { parent: 1, child: null }, { settings: { name: 'Artigos' } });

		expect(changed[1].settings?.name).toBe('Artigos');
		expect(changed[0].settings).toBeUndefined();
	});

	it('changes a child without touching its siblings', () => {
		const changed = updateItem(menu(), { parent: 0, child: 0 }, { settings: { hidden: true } });

		expect(changed[0].submenu?.[0].settings?.hidden).toBe(true);
	});

	it('removes an item at either level', () => {
		expect(removeItem(menu(), { parent: 1, child: null }).map((item) => item.id)).toEqual(['dashboard', 'media']);
		expect(removeItem(menu(), { parent: 0, child: 0 })[0].submenu).toHaveLength(0);
	});
});

describe('what the site has gained since', () => {
	const native: MenuItem[] = [
		{ id: 'dashboard', name: 'Painel', submenu: [{ id: 'home', name: 'Início', url: '' }, { id: 'updates', name: 'Atualizações', url: '' }] },
		{ id: 'woocommerce', name: 'WooCommerce', submenu: [] },
		{ id: 'posts', name: 'Posts', submenu: [] },
	];

	it('puts back a top-level item the menu does not have', () => {
		const restored = restoreMissing([{ id: 'dashboard', name: 'Painel', submenu: [] }, { id: 'posts', name: 'Posts', submenu: [] }], native);

		expect(restored.map((item) => item.id)).toContain('woocommerce');
	});

	it('puts back a child the menu does not have', () => {
		const restored = restoreMissing([{ id: 'dashboard', name: 'Painel', submenu: [{ id: 'home', name: 'Início', url: '' }] }], native);

		expect(restored[0].submenu?.map((entry) => entry.id)).toEqual(['home', 'updates']);
	});

	it('keeps what the menu added of its own', () => {
		const restored = restoreMissing([{ id: 'fd-custom-1', name: 'Atalho', url: 'https://example.com', custom: true, submenu: [] }], native);

		expect(restored.find((item) => item.id === 'fd-custom-1')).toBeDefined();
	});
});
