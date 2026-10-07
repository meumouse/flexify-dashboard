import { decodeHtml } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { formatPrice } from '@/react/woo/price';
import type { Address, Currency, Order, StoreData } from '@/react/woo/types';

/**
 * Formatting shared by the orders list, the preview and the details screen.
 */

export const ADDRESS_FIELDS: (keyof Address)[] = ['first_name', 'last_name', 'company', 'address_1', 'address_2', 'city', 'state', 'postcode', 'country', 'email', 'phone'];

export const emptyAddress = (): Address => ({
	first_name: '',
	last_name: '',
	company: '',
	address_1: '',
	address_2: '',
	city: '',
	state: '',
	postcode: '',
	country: '',
	email: '',
	phone: '',
});

export const customerName = (order?: Order | null): string => {
	const billing = order?.billing;
	const name = [billing?.first_name, billing?.last_name].filter(Boolean).join(' ').trim();

	if (name) {
		return name;
	}

	return billing?.company || billing?.email || __('Guest');
};

export const orderTitle = (order?: Order | null): string => sprintf(__('Order #%s'), order?.number || order?.id || '');

export const formatDate = (value?: string | null, withTime = false): string => {
	if (!value) {
		return '';
	}

	const options: Intl.DateTimeFormatOptions = withTime
		? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
		: { day: '2-digit', month: 'short', year: 'numeric' };

	return new Intl.DateTimeFormat(undefined, options).format(new Date(value));
};

export const relativeDate = (value?: string | null): string => {
	if (!value) {
		return '';
	}

	const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
	const abs = Math.abs(seconds);
	const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

	if (abs < 60) {
		return rtf.format(seconds, 'second');
	}

	if (abs < 3600) {
		return rtf.format(Math.round(seconds / 60), 'minute');
	}

	if (abs < 86400) {
		return rtf.format(Math.round(seconds / 3600), 'hour');
	}

	if (abs < 86400 * 7) {
		return rtf.format(Math.round(seconds / 86400), 'day');
	}

	return formatDate(value);
};

/**
 * Money of an order, which may use a different currency than the store default.
 */
export const orderPrice = (value: string | number | null | undefined, order: Order | null | undefined, currency: Currency): string => {
	if (value === '' || value === null || value === undefined) {
		return '';
	}

	return formatPrice(value, order?.currency_symbol ? { ...currency, symbol: decodeHtml(order.currency_symbol) } : currency);
};

export const itemsCount = (order?: Order | null): number => (order?.line_items ?? []).reduce((total, item) => total + (Number(item.quantity) || 0), 0);

export const totalRefunded = (order?: Order | null): number => (order?.refunds ?? []).reduce((total, refund) => total + Math.abs(Number(refund.total) || 0), 0);

export const shippingSummary = (order?: Order | null): { location: string; method: string } => ({
	location: [order?.shipping?.city, order?.shipping?.state].filter(Boolean).join(' / '),
	method: (order?.shipping_lines ?? [])
		.map((line) => line.method_title)
		.filter(Boolean)
		.join(', '),
});

export const formatAddress = (address?: Partial<Address> | null): string[] =>
	[
		[address?.first_name, address?.last_name].filter(Boolean).join(' '),
		address?.company,
		address?.address_1,
		address?.address_2,
		[address?.city, address?.state, address?.postcode].filter(Boolean).join(', '),
		address?.country,
	].filter((line): line is string => Boolean(line && String(line).trim()));

export const classicOrderUrl = (id: number, store: StoreData, adminUrl: string): string =>
	store.hpos ? `${adminUrl}admin.php?page=wc-orders&action=edit&id=${id}&fd_classic=1` : `${adminUrl}post.php?post=${id}&action=edit&fd_classic=1`;

/**
 * Keep only simple formatting tags and safe links from HTML stored in orders (e.g. notes).
 */
export const safeHtml = (html?: string | null): string => {
	const allowed = ['A', 'B', 'BR', 'CODE', 'EM', 'I', 'LI', 'OL', 'P', 'SPAN', 'STRONG', 'UL'];
	const doc = new DOMParser().parseFromString(`<div>${html ?? ''}</div>`, 'text/html');
	const root = doc.body.firstElementChild;

	if (!root) {
		return '';
	}

	const clean = (node: Element) => {
		[...node.children].forEach((child) => {
			clean(child);

			if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'TEMPLATE'].includes(child.tagName)) {
				child.remove();
				return;
			}

			if (!allowed.includes(child.tagName)) {
				child.replaceWith(...child.childNodes);
				return;
			}

			[...child.attributes].forEach((attribute) => {
				const keepHref = child.tagName === 'A' && attribute.name === 'href' && /^(https?:|mailto:|\/)/i.test(attribute.value.trim());

				if (!keepHref) {
					child.removeAttribute(attribute.name);
				}
			});

			if (child.tagName === 'A') {
				child.setAttribute('target', '_blank');
				child.setAttribute('rel', 'noopener noreferrer');
			}
		});
	};

	clean(root);

	return root.innerHTML;
};
