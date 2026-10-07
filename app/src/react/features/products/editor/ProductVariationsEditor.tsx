import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { __, sprintf } from '@/react/lib/i18n';
import { openMediaFrame } from '@/react/lib/wpMedia';
import { Alert, Badge, Button, EmptyState, Icon, Input, Select, Skeleton, Switch } from '@/react/ui';
import { useWoo } from '@/react/woo/WooProvider';
import { missingCombos, sameAttribute, type ParentAttribute } from '@/react/features/products/editor/variationCombos';
import type { ProductImage, Variation, VariationAttribute } from '@/react/woo/types';

/**
 * Variations of a variable product: generate from the attributes, edit inline and save in batch.
 */

const MAX_GENERATED = 100;

type DownloadFile = { id: string; name: string; file: string };

type VariationForm = {
	id: number;
	attributes: VariationAttribute[];
	sku: string;
	regular_price: string;
	sale_price: string;
	manage_stock: boolean;
	stock_quantity: string;
	stock_status: string;
	enabled: boolean;
	weight: string;
	description: string;
	image: ProductImage | null;
	virtual: boolean;
	downloadable: boolean;
	downloads: DownloadFile[];
	download_limit: string;
	download_expiry: string;
};

type BatchResult = {
	create?: (Variation & { error?: { message?: string } })[];
	update?: (Variation & { error?: { message?: string } })[];
	delete?: (Variation & { error?: { message?: string } })[];
};

export type VariationsHandle = {
	/** Save the changed variations; false when the request failed. */
	save: () => Promise<boolean>;
	reload: () => void;
};

type Props = {
	productId: number;
	/** Parent attributes as saved on the product */
	attributes: ParentAttribute[];
	onDirtyChange: (dirty: boolean) => void;
};

export const ProductVariationsEditor = forwardRef<VariationsHandle, Props>(function ProductVariationsEditor({ productId, attributes, onDirtyChange }, ref) {
	const confirm = useConfirm();
	const { notify } = useNotify();
	const { wc, store, currency, toDecimal, price } = useWoo();

	const [variations, setVariations] = useState<VariationForm[]>([]);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [expanded, setExpanded] = useState<number | null>(null);
	const [dirtyIds, setDirtyIds] = useState<Set<number>>(new Set());
	const [bulkPrice, setBulkPrice] = useState('');

	const variationAttributes = attributes.filter((attribute) => attribute.variation && attribute.options?.length);

	const attributeLabel = (attribute: ParentAttribute) => attribute.name || `#${attribute.id}`;

	const localPrice = useCallback(
		(value: string | number | null | undefined) => (value === '' || value === null || value === undefined ? '' : String(value).replace('.', currency.decimal_separator || ',')),
		[currency.decimal_separator]
	);

	const toForm = useCallback(
		(variation: Variation & Partial<{ weight: string; description: string; virtual: boolean; downloadable: boolean; downloads: DownloadFile[]; download_limit: number; download_expiry: number }>): VariationForm => ({
			id: variation.id,
			attributes: variation.attributes ?? [],
			sku: variation.sku || '',
			regular_price: localPrice(variation.regular_price),
			sale_price: localPrice(variation.sale_price),
			manage_stock: variation.manage_stock === true,
			stock_quantity: variation.stock_quantity === null || variation.stock_quantity === undefined ? '' : String(variation.stock_quantity),
			stock_status: variation.stock_status || 'instock',
			enabled: variation.status !== 'private',
			weight: variation.weight || '',
			description: variation.description || '',
			image: variation.image ?? null,
			virtual: Boolean(variation.virtual),
			downloadable: Boolean(variation.downloadable),
			downloads: (variation.downloads ?? []).map((file) => ({ id: file.id || '', name: file.name || '', file: file.file || '' })),
			download_limit: variation.download_limit === -1 || variation.download_limit === undefined ? '' : String(variation.download_limit),
			download_expiry: variation.download_expiry === -1 || variation.download_expiry === undefined ? '' : String(variation.download_expiry),
		}),
		[localPrice]
	);

	const load = useCallback(async () => {
		setLoading(true);
		const all: Variation[] = [];

		for (let page = 1; page <= 10; page += 1) {
			const response = await wc<Variation>(`products/${productId}/variations`, { params: { per_page: 100, page } });
			const items = response.data ?? [];
			all.push(...items);

			if (items.length < 100) {
				break;
			}
		}

		setVariations(all.map(toForm));
		setDirtyIds(new Set());
		setLoading(false);
	}, [productId, toForm, wc]);

	useEffect(() => {
		load();
	}, [load]);

	useEffect(() => onDirtyChange(dirtyIds.size > 0), [dirtyIds, onDirtyChange]);

	const markDirty = (id: number) => setDirtyIds((current) => new Set([...current, id]));

	const patch = (id: number, changes: Partial<VariationForm>) => {
		setVariations((current) => current.map((variation) => (variation.id === id ? { ...variation, ...changes } : variation)));
		markDirty(id);
	};

	const attributeValue = (variation: VariationForm, attribute: ParentAttribute) => variation.attributes.find((item) => sameAttribute(item, attribute))?.option || '';

	const setAttributeValue = (variation: VariationForm, attribute: ParentAttribute, option: string) => {
		const others = variation.attributes.filter((item) => !sameAttribute(item, attribute));

		patch(variation.id, { attributes: option ? [...others, { id: attribute.id ?? 0, name: attribute.name, option }] : others });
	};

	const variationTitle = (variation: VariationForm) =>
		variationAttributes.map((attribute) => attributeValue(variation, attribute) || sprintf(__('Any %s'), attributeLabel(attribute))).join(' · ') ||
		sprintf(__('Variation #%s'), variation.id);

	const toPayload = (variation: VariationForm): Record<string, unknown> => {
		const payload: Record<string, unknown> = {
			id: variation.id,
			attributes: variation.attributes,
			sku: variation.sku.trim(),
			regular_price: toDecimal(variation.regular_price),
			sale_price: toDecimal(variation.sale_price),
			manage_stock: variation.manage_stock,
			status: variation.enabled ? 'publish' : 'private',
			weight: String(variation.weight || ''),
			description: variation.description,
			virtual: variation.virtual,
			downloadable: variation.downloadable,
		};

		if (variation.image?.id) {
			payload.image = { id: variation.image.id };
		}

		if (variation.downloadable) {
			payload.downloads = variation.downloads
				.filter((file) => file.file.trim())
				.map((file) => ({ ...(file.id ? { id: file.id } : {}), name: file.name.trim() || file.file.split('/').pop(), file: file.file.trim() }));
			payload.download_limit = variation.download_limit === '' ? -1 : Number(variation.download_limit);
			payload.download_expiry = variation.download_expiry === '' ? -1 : Number(variation.download_expiry);
		}

		if (variation.manage_stock) {
			payload.stock_quantity = variation.stock_quantity === '' ? null : Number(variation.stock_quantity);
		} else {
			payload.stock_status = variation.stock_status;
		}

		return payload;
	};

	const runBatch = async (data: Record<string, unknown>): Promise<BatchResult | null> => {
		const result = (await wc<BatchResult>(`products/${productId}/variations/batch`, { method: 'POST', data })).data as unknown as BatchResult;
		const failures = (['create', 'update', 'delete'] as const).flatMap((key) => (result?.[key] ?? []).filter((item) => item.error));

		if (failures.length) {
			notify({ title: __('Some variations could not be saved'), message: failures[0].error?.message || '', tone: 'error' });
		}

		return result ?? null;
	};

	const save = useCallback(async () => {
		if (!dirtyIds.size) {
			return true;
		}

		const update = variations.filter((variation) => dirtyIds.has(variation.id)).map(toPayload);
		const result = await runBatch({ update });

		if (!result) {
			return false;
		}

		const saved = (result.update ?? []).filter((item) => !item.error);

		setVariations((current) =>
			current.map((variation) => {
				const updated = saved.find((item) => item.id === variation.id);

				return updated ? toForm(updated) : variation;
			})
		);
		setDirtyIds(new Set());

		return true;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dirtyIds, variations]);

	useImperativeHandle(ref, () => ({ save, reload: load }), [load, save]);

	const generate = async () => {
		if (!variationAttributes.length) {
			return;
		}

		const missing = missingCombos(variationAttributes, variations);

		if (!missing.length) {
			notify({ title: __('All variations already exist'), tone: 'info' });
			return;
		}

		if (missing.length > MAX_GENERATED) {
			notify({ title: sprintf(__('Only the first %d variations will be created.'), MAX_GENERATED), tone: 'warning' });
		}

		setBusy(true);

		if (await save()) {
			const result = await runBatch({ create: missing.slice(0, MAX_GENERATED).map((combo) => ({ attributes: combo })) });
			const created = (result?.create ?? []).filter((item) => !item.error);

			if (created.length) {
				setVariations((current) => [...current, ...created.map(toForm)]);
				notify({ title: sprintf(__('%d variation(s) created'), created.length), message: __('Set their prices to make them purchasable.'), tone: 'success' });
			}
		}

		setBusy(false);
	};

	const addVariation = async () => {
		setBusy(true);
		const result = await runBatch({ create: [{ attributes: [] }] });
		const created = (result?.create ?? []).filter((item) => !item.error);

		if (created.length) {
			setVariations((current) => [...current, ...created.map(toForm)]);
			setExpanded(created[0].id);
		}

		setBusy(false);
	};

	const removeVariation = async (variation: VariationForm) => {
		const confirmed = await confirm({ title: __('Delete variation?'), message: variationTitle(variation), confirmLabel: __('Delete'), variant: 'danger' });

		if (!confirmed) {
			return;
		}

		if (await runBatch({ delete: [variation.id] })) {
			setVariations((current) => current.filter((item) => item.id !== variation.id));
			setDirtyIds((current) => {
				const next = new Set(current);
				next.delete(variation.id);

				return next;
			});
		}
	};

	const applyBulkPrice = () => {
		if (bulkPrice === '') {
			return;
		}

		setVariations((current) => current.map((variation) => ({ ...variation, regular_price: bulkPrice })));
		setDirtyIds(new Set(variations.map((variation) => variation.id)));
		setBulkPrice('');
	};

	const chooseImage = async (variation: VariationForm) => {
		const [image] = await openMediaFrame({ title: __('Variation image') });

		if (image) {
			patch(variation.id, { image: { id: image.id, src: image.src } });
		}
	};

	const chooseDownloadFile = async (variation: VariationForm, index: number) => {
		const [file] = await openMediaFrame({ title: __('Downloadable file'), button: __('Use file'), type: '' });

		if (!file) {
			return;
		}

		patch(variation.id, {
			downloads: variation.downloads.map((item, itemIndex) => (itemIndex === index ? { ...item, file: file.url, name: item.name || file.title } : item)),
		});
	};

	const setDownload = (variation: VariationForm, index: number, changes: Partial<DownloadFile>) =>
		patch(variation.id, { downloads: variation.downloads.map((file, fileIndex) => (fileIndex === index ? { ...file, ...changes } : file)) });

	const stockOptions = store.stock_statuses.length
		? store.stock_statuses
		: [
				{ value: 'instock', label: __('In stock') },
				{ value: 'outofstock', label: __('Out of stock') },
				{ value: 'onbackorder', label: __('On backorder') },
			];

	return (
		<div>
			{!variationAttributes.length ? (
				<Alert
					variant="info"
					className="mb-4"
					title={__('No attributes used for variations')}
					message={__('Add attributes, mark them as “Used for variations” and save the product.')}
				/>
			) : null}

			<div className="mb-4 flex flex-wrap items-center gap-2">
				<Button size="sm" variant="outline" icon="sparkles" loading={busy} disabled={!variationAttributes.length} onClick={generate}>
					{__('Generate variations')}
				</Button>
				<Button size="sm" variant="outline" icon="add" disabled={busy} onClick={addVariation}>
					{__('Add manually')}
				</Button>
				{variations.length ? (
					<div className="flex items-center gap-2 sm:ms-auto">
						<Input
							value={bulkPrice}
							onChange={(event) => setBulkPrice(event.target.value)}
							size="sm"
							className="w-40"
							prefix={currency.symbol}
							inputMode="decimal"
							placeholder={__('Price for all')}
							aria-label={__('Regular price for all variations')}
						/>
						<Button size="sm" variant="outline" disabled={bulkPrice === ''} onClick={applyBulkPrice}>
							{__('Apply')}
						</Button>
					</div>
				) : null}
			</div>

			{loading ? (
				<div className="space-y-3">
					{[0, 1, 2].map((index) => (
						<Skeleton key={index} className="h-16 w-full rounded-xl" />
					))}
				</div>
			) : !variations.length ? (
				<EmptyState compact icon="stacks" title={__('No variations yet')} description={__('Generate variations from the attributes or add them one by one.')} />
			) : (
				<ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
					{variations.map((variation) => (
						<li key={variation.id}>
							<div className="flex items-center gap-3 px-4 py-3">
								<button
									type="button"
									className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 text-gray-400 hover:text-brand-500 dark:bg-gray-800"
									aria-label={__('Choose variation image')}
									onClick={() => chooseImage(variation)}
								>
									{variation.image?.src ? <img src={variation.image.src} alt="" className="h-full w-full object-cover" /> : <Icon name="image" className="text-lg" />}
								</button>

								<button
									type="button"
									className="min-w-0 flex-1 text-start"
									aria-expanded={expanded === variation.id}
									onClick={() => setExpanded(expanded === variation.id ? null : variation.id)}
								>
									<p className="flex items-center gap-2 truncate font-medium text-gray-800 dark:text-white/90">
										{variationTitle(variation)}
										{dirtyIds.has(variation.id) ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning-500" title={__('Unsaved changes')} /> : null}
									</p>
									<p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">
										{variation.regular_price ? (
											price(toDecimal(variation.sale_price || variation.regular_price))
										) : (
											<span className="text-warning-600 dark:text-orange-400">{__('No price')}</span>
										)}
										{variation.sku ? ` · ${variation.sku}` : null}
										{variation.manage_stock ? ` · ${sprintf(__('%s in stock'), variation.stock_quantity === '' ? 0 : variation.stock_quantity)}` : null}
									</p>
								</button>

								{!variation.enabled ? <Badge color="light">{__('Disabled')}</Badge> : null}
								<Button
									variant="ghost"
									size="xs"
									icon={expanded === variation.id ? 'expand_less' : 'expand_more'}
									iconOnly
									aria-label={__('Edit variation')}
									onClick={() => setExpanded(expanded === variation.id ? null : variation.id)}
								/>
								<Button variant="ghost" size="xs" icon="delete" iconOnly aria-label={__('Delete variation')} onClick={() => removeVariation(variation)} />
							</div>

							{expanded === variation.id ? (
								<div className="grid gap-4 border-t border-gray-100 bg-gray-50/60 px-4 py-4 dark:border-gray-800 dark:bg-white/[0.02] sm:grid-cols-2 lg:grid-cols-3">
									{variationAttributes.map((attribute) => (
										<Select
											key={attribute.id || attribute.name}
											value={attributeValue(variation, attribute)}
											onChange={(event) => setAttributeValue(variation, attribute, event.target.value)}
											label={attributeLabel(attribute)}
											options={attribute.options.map((option) => ({ value: option, label: option }))}
											placeholder={sprintf(__('Any %s'), attributeLabel(attribute))}
										/>
									))}
									<Input value={variation.sku} onChange={(event) => patch(variation.id, { sku: event.target.value })} label={__('SKU')} />
									<Input
										value={variation.regular_price}
										onChange={(event) => patch(variation.id, { regular_price: event.target.value })}
										label={__('Regular price')}
										prefix={currency.symbol}
										inputMode="decimal"
									/>
									<Input
										value={variation.sale_price}
										onChange={(event) => patch(variation.id, { sale_price: event.target.value })}
										label={__('Sale price')}
										prefix={currency.symbol}
										inputMode="decimal"
									/>
									<Input value={variation.weight} onChange={(event) => patch(variation.id, { weight: event.target.value })} label={__('Weight')} suffix={store.weight_unit} inputMode="decimal" />
									{variation.manage_stock ? (
										<Input
											value={variation.stock_quantity}
											onChange={(event) => patch(variation.id, { stock_quantity: event.target.value })}
											type="number"
											step={1}
											label={__('Stock quantity')}
										/>
									) : (
										<Select value={variation.stock_status} onChange={(event) => patch(variation.id, { stock_status: event.target.value })} options={stockOptions} label={__('Stock status')} />
									)}
									<Input
										value={variation.description}
										onChange={(event) => patch(variation.id, { description: event.target.value })}
										className="sm:col-span-2 lg:col-span-3"
										label={__('Description')}
									/>
									<div className="flex flex-wrap gap-6 sm:col-span-2 lg:col-span-3">
										<Switch checked={variation.enabled} onCheckedChange={(enabled) => patch(variation.id, { enabled })} label={__('Enabled')} />
										<Switch checked={variation.manage_stock} onCheckedChange={(manage_stock) => patch(variation.id, { manage_stock })} label={__('Track stock')} />
										<Switch checked={variation.virtual} onCheckedChange={(virtual) => patch(variation.id, { virtual })} label={__('Virtual')} />
										<Switch checked={variation.downloadable} onCheckedChange={(downloadable) => patch(variation.id, { downloadable })} label={__('Downloadable')} />
									</div>

									{variation.downloadable ? (
										<div className="space-y-3 rounded-xl border border-gray-200 p-4 sm:col-span-2 lg:col-span-3 dark:border-gray-800">
											<p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">{__('Downloadable files')}</p>
											{variation.downloads.map((file, fileIndex) => (
												<div key={fileIndex} className="grid items-end gap-3 sm:grid-cols-[1fr_2fr_auto]">
													<Input value={file.name} onChange={(event) => setDownload(variation, fileIndex, { name: event.target.value })} size="sm" label={__('File name')} />
													<Input
														value={file.file}
														onChange={(event) => setDownload(variation, fileIndex, { file: event.target.value })}
														size="sm"
														type="url"
														label={__('File URL')}
														placeholder="https://"
													/>
													<div className="flex gap-1">
														<Button size="sm" variant="outline" icon="attach_file" iconOnly aria-label={__('Choose file')} onClick={() => chooseDownloadFile(variation, fileIndex)} />
														<Button
															size="sm"
															variant="ghost"
															icon="delete"
															iconOnly
															aria-label={__('Remove file')}
															onClick={() => patch(variation.id, { downloads: variation.downloads.filter((_, itemIndex) => itemIndex !== fileIndex) })}
														/>
													</div>
												</div>
											))}
											<div className="flex flex-wrap items-end gap-3">
												<Button
													size="xs"
													variant="outline"
													icon="add"
													onClick={() => patch(variation.id, { downloads: [...variation.downloads, { id: '', name: '', file: '' }] })}
												>
													{__('Add file')}
												</Button>
												<Input
													value={variation.download_limit}
													onChange={(event) => patch(variation.id, { download_limit: event.target.value })}
													size="sm"
													type="number"
													min={0}
													step={1}
													className="w-40"
													label={__('Download limit')}
													placeholder={__('Unlimited')}
												/>
												<Input
													value={variation.download_expiry}
													onChange={(event) => patch(variation.id, { download_expiry: event.target.value })}
													size="sm"
													type="number"
													min={0}
													step={1}
													className="w-44"
													label={__('Download expiry (days)')}
													placeholder={__('Never')}
												/>
											</div>
										</div>
									) : null}
								</div>
							) : null}
						</li>
					))}
				</ul>
			)}
		</div>
	);
});
