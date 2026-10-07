import { useEffect, useState } from 'react';
import { useNotify } from '@/react/app/ToastProvider';
import { __ } from '@/react/lib/i18n';
import { Badge, Button, Icon, Skeleton } from '@/react/ui';
import { useUpdateVariation, useVariations } from '@/react/woo/queries';
import { useWoo } from '@/react/woo/WooProvider';
import type { Product, Variation } from '@/react/woo/types';

/**
 * Variations of a variable product, editable inline from the products list.
 */

type Draft = {
	regular_price: string;
	sale_price: string;
	stock_quantity: string;
};

const inputClass =
	'h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90';

const headerClass = 'px-4 py-2.5 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400';

type Props = {
	product: Product;
	onUpdated?: () => void;
};

export const ProductVariations = ({ product, onUpdated }: Props) => {
	const { currency, store, price, toDecimal } = useWoo();
	const { notify } = useNotify();
	const { data: variations = [], isLoading, isFetching, refetch } = useVariations(product.id);
	const updateVariation = useUpdateVariation(product.id);
	const [drafts, setDrafts] = useState<Record<number, Draft>>({});
	const [savingId, setSavingId] = useState<number | null>(null);

	const localize = (value: string | number | null | undefined) =>
		value === '' || value === null || value === undefined ? '' : String(value).replace('.', currency.decimal_separator || ',');

	const toDraft = (variation: Variation): Draft => ({
		regular_price: localize(variation.regular_price),
		sale_price: localize(variation.sale_price),
		stock_quantity: variation.stock_quantity === null || variation.stock_quantity === undefined ? '' : String(variation.stock_quantity),
	});

	useEffect(() => {
		setDrafts(Object.fromEntries(variations.map((variation) => [variation.id, toDraft(variation)])));
		// Rebuilding on every fetch would discard what the user is typing, so only the identity list matters.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [variations.map((variation) => variation.id).join(',')]);

	const stockLabel = (status: string) => store.stock_statuses.find((option) => option.value === status)?.label ?? status;
	const stockColor = (variation: Variation) => (variation.stock_status === 'outofstock' ? 'error' : variation.stock_status === 'onbackorder' ? 'warning' : 'success');

	const attributesLabel = (variation: Variation) =>
		(variation.attributes ?? []).map((attribute) => `${attribute.name}: ${attribute.option || __('Any')}`).join(' · ') || `#${variation.id}`;

	const isDirty = (variation: Variation) => {
		const draft = drafts[variation.id];

		if (!draft) {
			return false;
		}

		return (
			toDecimal(draft.regular_price) !== (variation.regular_price || '') ||
			toDecimal(draft.sale_price) !== (variation.sale_price || '') ||
			(variation.manage_stock && draft.stock_quantity !== (variation.stock_quantity === null || variation.stock_quantity === undefined ? '' : String(variation.stock_quantity)))
		);
	};

	const setDraft = (id: number, patch: Partial<Draft>) => setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));

	const save = async (variation: Variation) => {
		const draft = drafts[variation.id];
		const data: Record<string, unknown> = {
			regular_price: toDecimal(draft.regular_price),
			sale_price: toDecimal(draft.sale_price),
		};

		if (data.sale_price !== '' && data.regular_price !== '' && Number(data.sale_price) >= Number(data.regular_price)) {
			notify({ title: __('The sale price must be lower than the regular price.'), tone: 'error' });
			return;
		}

		if (variation.manage_stock) {
			data.stock_quantity = draft.stock_quantity === '' ? null : Number(draft.stock_quantity);
		}

		setSavingId(variation.id);

		try {
			const updated = await updateVariation.mutateAsync({ id: variation.id, data });
			setDraft(variation.id, toDraft(updated));
			notify({ title: __('Variation updated'), tone: 'success' });
			onUpdated?.();
			refetch();
		} finally {
			setSavingId(null);
		}
	};

	return (
		<div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
			<div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
				<p className="text-sm font-medium text-gray-800 dark:text-white/90">{__('Variations')}</p>
				<Button variant="ghost" size="xs" icon="refresh" disabled={isFetching} onClick={() => refetch()}>
					{__('Reload')}
				</Button>
			</div>

			{isLoading ? (
				<div className="space-y-3 p-4">
					{[0, 1, 2].map((index) => (
						<Skeleton key={index} className="h-10" />
					))}
				</div>
			) : !variations.length ? (
				<p className="p-4 text-sm text-gray-500 dark:text-gray-400">{__('This product has no variations.')}</p>
			) : (
				<div className="overflow-x-auto custom-scrollbar">
					<table className="min-w-full">
						<thead>
							<tr className="border-b border-gray-100 dark:border-gray-800">
								<th className={headerClass}>{__('Variation')}</th>
								<th className={headerClass}>{__('Regular price')}</th>
								<th className={headerClass}>{__('Sale price')}</th>
								<th className={headerClass}>{__('Stock')}</th>
								<th className="px-4 py-2.5">
									<span className="sr-only">{__('Actions')}</span>
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
							{variations.map((variation) => {
								const draft = drafts[variation.id];

								if (!draft) {
									return null;
								}

								return (
									<tr key={variation.id}>
										<td className="px-4 py-3">
											<div className="flex min-w-52 items-center gap-3">
												<div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
													{variation.image?.src ? (
														<img src={variation.image.src} alt="" className="h-full w-full object-cover" loading="lazy" />
													) : (
														<Icon name="image" className="text-base text-gray-400" />
													)}
												</div>
												<div className="min-w-0">
													<p className="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">{attributesLabel(variation)}</p>
													<p className="text-theme-xs text-gray-500 dark:text-gray-400">
														{variation.sku ? `${__('SKU')}: ${variation.sku} · ` : null}
														{price(variation.price) || '—'}
													</p>
												</div>
											</div>
										</td>
										<td className="px-4 py-3">
											<div className="relative w-32">
												<span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-theme-xs text-gray-500">{currency.symbol}</span>
												<input
													value={draft.regular_price}
													onChange={(event) => setDraft(variation.id, { regular_price: event.target.value })}
													className={`${inputClass} ps-9`}
													inputMode="decimal"
													aria-label={__('Regular price')}
												/>
											</div>
										</td>
										<td className="px-4 py-3">
											<div className="relative w-32">
												<span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-theme-xs text-gray-500">{currency.symbol}</span>
												<input
													value={draft.sale_price}
													onChange={(event) => setDraft(variation.id, { sale_price: event.target.value })}
													className={`${inputClass} ps-9`}
													inputMode="decimal"
													aria-label={__('Sale price')}
												/>
											</div>
										</td>
										<td className="px-4 py-3">
											{variation.manage_stock ? (
												<input
													value={draft.stock_quantity}
													onChange={(event) => setDraft(variation.id, { stock_quantity: event.target.value })}
													type="number"
													step="1"
													className={`${inputClass} w-24`}
													aria-label={__('Stock quantity')}
												/>
											) : (
												<Badge color={stockColor(variation)}>{stockLabel(variation.stock_status)}</Badge>
											)}
										</td>
										<td className="px-4 py-3 text-end">
											<Button
												size="xs"
												variant={isDirty(variation) ? 'primary' : 'outline'}
												disabled={!isDirty(variation)}
												loading={savingId === variation.id}
												onClick={() => save(variation)}
											>
												{__('Save')}
											</Button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
};
