import { __ } from '@/react/lib/i18n';
import { decodeHtml } from '@/react/lib/html';
import type { BadgeColor } from '@/react/ui/recipes';
import type { Category, Option, Product, StoreData } from '@/react/woo/types';

/**
 * Labels and badge colors shared by the products list, the quick edit and the catalog views.
 */

export const statusBadges = (): Record<string, { color: BadgeColor; label: string }> => ({
	publish: { color: 'success', label: __('Published') },
	draft: { color: 'light', label: __('Draft') },
	pending: { color: 'warning', label: __('Pending') },
	private: { color: 'purple', label: __('Private') },
	future: { color: 'info', label: __('Scheduled') },
	trash: { color: 'dark', label: __('Trash') },
});

export const stockBadge = (product: Product, store: StoreData): { color: BadgeColor; label: string } => {
	if (product.stock_status === 'outofstock') {
		return { color: 'error', label: __('Out of stock') };
	}

	if (product.stock_status === 'onbackorder') {
		return { color: 'warning', label: __('On backorder') };
	}

	if (product.manage_stock && product.stock_quantity !== null && product.stock_quantity <= (store.low_stock_amount || 2)) {
		return { color: 'warning', label: __('Low stock') };
	}

	return { color: 'success', label: __('In stock') };
};

export const formatDate = (value?: string | null): string => {
	if (!value) {
		return '';
	}

	return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
};

/**
 * Flatten the category tree into select options, indenting each level with a dash.
 */
export const categoryOptions = (categories: Category[]): Option[] => {
	const byParent = new Map<number, Category[]>();

	categories.forEach((category) => {
		const siblings = byParent.get(category.parent) ?? [];
		siblings.push(category);
		byParent.set(category.parent, siblings);
	});

	const list: Option[] = [];

	const walk = (parent: number, depth: number) => {
		[...(byParent.get(parent) ?? [])]
			.sort((a, b) => a.name.localeCompare(b.name))
			.forEach((category) => {
				list.push({ value: String(category.id), label: `${'— '.repeat(depth)}${decodeHtml(category.name)}` });
				walk(category.id, depth + 1);
			});
	};

	walk(0, 0);

	return list;
};
