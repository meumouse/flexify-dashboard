import { useEffect, useMemo, useState } from 'react';
import { useNotify } from '@/react/app/ToastProvider';
import { decodeHtml } from '@/react/lib/html';
import { __ } from '@/react/lib/i18n';
import { Alert, Button, Checkbox, Field, Icon, Input, Select, Sheet, Switch } from '@/react/ui';
import { useShippingClasses, useUpdateProduct } from '@/react/woo/queries';
import { useWoo } from '@/react/woo/WooProvider';
import type { Category, Product } from '@/react/woo/types';

/**
 * Side panel to change the fields of a product without opening the full editor.
 */

type Form = {
	name: string;
	slug: string;
	status: string;
	catalog_visibility: string;
	featured: boolean;
	sku: string;
	regular_price: string;
	sale_price: string;
	manage_stock: boolean;
	stock_quantity: string;
	stock_status: string;
	backorders: string;
	weight: string;
	length: string;
	width: string;
	height: string;
	shipping_class: string;
	categories: number[];
	tags: string;
};

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	product: Product | null;
	categories: Category[];
	onSaved: (product: Product) => void;
};

const EMPTY_FORM: Form = {
	name: '',
	slug: '',
	status: 'publish',
	catalog_visibility: 'visible',
	featured: false,
	sku: '',
	regular_price: '',
	sale_price: '',
	manage_stock: false,
	stock_quantity: '',
	stock_status: 'instock',
	backorders: 'no',
	weight: '',
	length: '',
	width: '',
	height: '',
	shipping_class: '',
	categories: [],
	tags: '',
};

export const ProductQuickEdit = ({ open, onOpenChange, product, categories, onSaved }: Props) => {
	const { store, currency, toDecimal } = useWoo();
	const { notify } = useNotify();
	const updateProduct = useUpdateProduct();
	const { data: shippingClasses = [] } = useShippingClasses();

	const [form, setForm] = useState<Form>(EMPTY_FORM);
	const [errors, setErrors] = useState<Partial<Record<'name' | 'sale_price' | 'stock_quantity', string>>>({});
	const [categorySearch, setCategorySearch] = useState('');

	const isVariable = product?.type === 'variable';
	const isGrouped = product ? ['grouped', 'external'].includes(product.type) : false;

	const localize = (value: string | number | null | undefined) =>
		value === '' || value === null || value === undefined ? '' : String(value).replace('.', currency.decimal_separator || ',');

	useEffect(() => {
		if (!open || !product) {
			return;
		}

		setErrors({});
		setCategorySearch('');
		setForm({
			name: decodeHtml(product.name),
			slug: product.slug || '',
			status: product.status || 'publish',
			catalog_visibility: product.catalog_visibility || 'visible',
			featured: Boolean(product.featured),
			sku: product.sku || '',
			regular_price: localize(product.regular_price),
			sale_price: localize(product.sale_price),
			manage_stock: product.manage_stock === true,
			stock_quantity: product.stock_quantity === null || product.stock_quantity === undefined ? '' : String(product.stock_quantity),
			stock_status: product.stock_status || 'instock',
			backorders: product.backorders || 'no',
			weight: product.weight || '',
			length: product.dimensions?.length || '',
			width: product.dimensions?.width || '',
			height: product.dimensions?.height || '',
			shipping_class: product.shipping_class || '',
			categories: (product.categories ?? []).map((category) => category.id),
			tags: (product.tags ?? []).map((tag) => tag.name).join(', '),
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, product?.id]);

	const statusOptions = [
		{ value: 'publish', label: __('Published') },
		{ value: 'draft', label: __('Draft') },
		{ value: 'pending', label: __('Pending review') },
		{ value: 'private', label: __('Private') },
	];

	const visibilityOptions = [
		{ value: 'visible', label: __('Shop and search results') },
		{ value: 'catalog', label: __('Shop only') },
		{ value: 'search', label: __('Search results only') },
		{ value: 'hidden', label: __('Hidden') },
	];

	const backorderOptions = [
		{ value: 'no', label: __('Do not allow') },
		{ value: 'notify', label: __('Allow, but notify customer') },
		{ value: 'yes', label: __('Allow') },
	];

	const filteredCategories = useMemo(() => {
		const term = categorySearch.trim().toLowerCase();

		return categories
			.map((category) => ({ ...category, label: decodeHtml(category.name) }))
			.filter((category) => !term || category.label.toLowerCase().includes(term))
			.sort((a, b) => a.label.localeCompare(b.label));
	}, [categories, categorySearch]);

	const set = (patch: Partial<Form>) => setForm((current) => ({ ...current, ...patch }));

	const validate = () => {
		const next: typeof errors = {};

		if (!form.name.trim()) {
			next.name = __('The product name is required.');
		}

		const regular = Number(toDecimal(form.regular_price));
		const sale = Number(toDecimal(form.sale_price));

		if (!isVariable && form.sale_price !== '' && form.regular_price !== '' && sale >= regular) {
			next.sale_price = __('The sale price must be lower than the regular price.');
		}

		if (form.manage_stock && form.stock_quantity !== '' && !Number.isFinite(Number(form.stock_quantity))) {
			next.stock_quantity = __('Enter a valid quantity.');
		}

		setErrors(next);

		return !Object.keys(next).length;
	};

	const buildPayload = () => {
		const payload: Record<string, unknown> = {
			name: form.name.trim(),
			slug: form.slug.trim(),
			status: form.status,
			catalog_visibility: form.catalog_visibility,
			featured: form.featured,
			sku: form.sku.trim(),
			categories: form.categories.map((id) => ({ id })),
			tags: form.tags
				.split(',')
				.map((name) => name.trim())
				.filter(Boolean)
				.map((name) => {
					const existing = (product?.tags ?? []).find((tag) => tag.name.toLowerCase() === name.toLowerCase());

					return existing ? { id: existing.id } : { name };
				}),
			weight: String(form.weight || ''),
			dimensions: { length: String(form.length || ''), width: String(form.width || ''), height: String(form.height || '') },
			shipping_class: form.shipping_class,
		};

		if (!isVariable && !isGrouped) {
			payload.regular_price = toDecimal(form.regular_price);
			payload.sale_price = toDecimal(form.sale_price);
		}

		if (!isVariable || !form.manage_stock) {
			payload.manage_stock = form.manage_stock;
		}

		if (form.manage_stock) {
			payload.stock_quantity = form.stock_quantity === '' ? null : Number(form.stock_quantity);
			payload.backorders = form.backorders;
		} else if (!isVariable) {
			payload.stock_status = form.stock_status;
		}

		return payload;
	};

	const save = async () => {
		if (!product || !validate()) {
			return;
		}

		const updated = await updateProduct.mutateAsync({ id: product.id, data: buildPayload() });

		notify({ title: __('Product updated'), tone: 'success' });
		onSaved(updated);
		onOpenChange(false);
	};

	const editUrl = product ? `${window.location.pathname.replace(/edit\.php$/, '')}post.php?post=${product.id}&action=edit` : '#';
	const typeLabel = product ? (store.product_types.find((type) => type.value === product.type)?.label ?? product.type) : '';

	return (
		<Sheet
			open={open}
			onOpenChange={onOpenChange}
			size="lg"
			title={__('Quick edit')}
			description={form.name}
			footer={
				<>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{__('Cancel')}
					</Button>
					<Button type="submit" form="fd-product-quick-edit" loading={updateProduct.isPending}>
						{__('Save changes')}
					</Button>
				</>
			}
		>
			{product ? (
				<form
					id="fd-product-quick-edit"
					className="space-y-6"
					onSubmit={(event) => {
						event.preventDefault();
						save();
					}}
				>
					<div className="flex items-center gap-4 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
						<div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
							{product.images?.[0]?.src ? <img src={product.images[0].src} alt="" className="h-full w-full object-cover" /> : <Icon name="image" className="text-xl text-gray-400" />}
						</div>
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
								#{product.id} · {typeLabel}
							</p>
							<a href={editUrl} className="text-theme-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400">
								{__('Open full editor')}
							</a>
						</div>
					</div>

					<section className="space-y-4">
						<h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">{__('General')}</h4>
						<Input value={form.name} onChange={(event) => set({ name: event.target.value })} label={__('Name')} error={errors.name} required />
						<div className="grid gap-4 sm:grid-cols-2">
							<Input value={form.slug} onChange={(event) => set({ slug: event.target.value })} label={__('Slug')} />
							<Input value={form.sku} onChange={(event) => set({ sku: event.target.value })} label={__('SKU')} />
							<Select value={form.status} onChange={(event) => set({ status: event.target.value })} label={__('Status')} options={statusOptions} />
							<Select
								value={form.catalog_visibility}
								onChange={(event) => set({ catalog_visibility: event.target.value })}
								label={__('Catalog visibility')}
								options={visibilityOptions}
							/>
						</div>
						<Switch checked={form.featured} onCheckedChange={(featured) => set({ featured })} label={__('Featured product')} />
					</section>

					<section className="space-y-4 border-t border-gray-100 pt-6 dark:border-gray-800">
						<h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">{__('Pricing')}</h4>
						{isVariable ? (
							<Alert variant="info" message={__('Prices of variable products are managed in each variation. Expand the product in the list to edit them.')} />
						) : !isGrouped ? (
							<div className="grid gap-4 sm:grid-cols-2">
								<Input
									value={form.regular_price}
									onChange={(event) => set({ regular_price: event.target.value })}
									label={__('Regular price')}
									prefix={currency.symbol}
									inputMode="decimal"
								/>
								<Input
									value={form.sale_price}
									onChange={(event) => set({ sale_price: event.target.value })}
									label={__('Sale price')}
									prefix={currency.symbol}
									inputMode="decimal"
									error={errors.sale_price}
								/>
							</div>
						) : null}
					</section>

					<section className="space-y-4 border-t border-gray-100 pt-6 dark:border-gray-800">
						<h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">{__('Inventory')}</h4>
						<Switch checked={form.manage_stock} onCheckedChange={(manage_stock) => set({ manage_stock })} label={__('Track stock quantity')} />
						{form.manage_stock ? (
							<div className="grid gap-4 sm:grid-cols-2">
								<Input
									value={form.stock_quantity}
									onChange={(event) => set({ stock_quantity: event.target.value })}
									type="number"
									step="1"
									label={__('Quantity')}
									error={errors.stock_quantity}
								/>
								<Select value={form.backorders} onChange={(event) => set({ backorders: event.target.value })} label={__('Allow backorders?')} options={backorderOptions} />
							</div>
						) : !isVariable ? (
							<Select value={form.stock_status} onChange={(event) => set({ stock_status: event.target.value })} label={__('Stock status')} options={store.stock_statuses} />
						) : null}
					</section>

					<section className="space-y-4 border-t border-gray-100 pt-6 dark:border-gray-800">
						<h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">{__('Shipping')}</h4>
						<div className="grid gap-4 sm:grid-cols-4">
							<Input value={form.weight} onChange={(event) => set({ weight: event.target.value })} label={__('Weight')} suffix={store.weight_unit} inputMode="decimal" />
							<Input value={form.length} onChange={(event) => set({ length: event.target.value })} label={__('Length')} suffix={store.dimension_unit} inputMode="decimal" />
							<Input value={form.width} onChange={(event) => set({ width: event.target.value })} label={__('Width')} suffix={store.dimension_unit} inputMode="decimal" />
							<Input value={form.height} onChange={(event) => set({ height: event.target.value })} label={__('Height')} suffix={store.dimension_unit} inputMode="decimal" />
						</div>
						<Select
							value={form.shipping_class}
							onChange={(event) => set({ shipping_class: event.target.value })}
							label={__('Shipping class')}
							placeholder={__('No shipping class')}
							options={shippingClasses}
						/>
					</section>

					<section className="space-y-4 border-t border-gray-100 pt-6 dark:border-gray-800">
						<h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">{__('Organization')}</h4>
						<Field label={__('Categories')}>
							<div className="rounded-lg border border-gray-300 dark:border-gray-700">
								<input
									value={categorySearch}
									onChange={(event) => setCategorySearch(event.target.value)}
									type="search"
									className="w-full rounded-t-lg border-b border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-hidden dark:border-gray-800 dark:text-white/90"
									placeholder={__('Filter categories')}
									aria-label={__('Filter categories')}
								/>
								<div className="max-h-48 space-y-2 overflow-y-auto p-3 custom-scrollbar">
									{filteredCategories.map((category) => (
										<Checkbox
											key={category.id}
											checked={form.categories.includes(category.id)}
											onCheckedChange={(checked) =>
												set({ categories: checked ? [...form.categories, category.id] : form.categories.filter((id) => id !== category.id) })
											}
											label={category.label}
											size="sm"
										/>
									))}
									{!filteredCategories.length ? <p className="text-theme-xs text-gray-500">{__('No categories found')}</p> : null}
								</div>
							</div>
						</Field>
						<Input value={form.tags} onChange={(event) => set({ tags: event.target.value })} label={__('Tags')} hint={__('Separate tags with commas.')} />
					</section>
				</form>
			) : null}
		</Sheet>
	);
};
