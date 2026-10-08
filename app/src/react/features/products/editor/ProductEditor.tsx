import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { useWpData } from '@/react/app/WpDataProvider';
import { useUnsavedChanges } from '@/react/hooks/useUnsavedChanges';
import { decodeHtml } from '@/react/lib/html';
import { __ } from '@/react/lib/i18n';
import { useMediaPicker } from '@/react/app/MediaPickerProvider';
import {
	Alert,
	Badge,
	Button,
	Card,
	Checkbox,
	DropdownMenu,
	EmptyState,
	Icon,
	Input,
	PageHeader,
	RichText,
	SearchInput,
	Select,
	Skeleton,
	Switch,
	Tabs,
	Textarea,
	type MenuItem,
} from '@/react/ui';
import { useCategories, useShippingClasses, wooKeys } from '@/react/woo/queries';
import { useWoo } from '@/react/woo/WooProvider';
import { ProductAttributes, type ProductAttribute } from '@/react/features/products/editor/ProductAttributes';
import { ProductPicker } from '@/react/features/products/editor/ProductPicker';
import { ProductVariationsEditor, type VariationsHandle } from '@/react/features/products/editor/ProductVariationsEditor';
import { useQueryClient } from '@tanstack/react-query';
import type { Category, Product } from '@/react/woo/types';

/**
 * Full product editor: general data, pricing, inventory, shipping, attributes, variations,
 * linked products, images, categories and tags.
 */

type DownloadFile = { id: string; name: string; file: string };
type EditorImage = { id: number; src: string; alt: string };

type Form = {
	name: string;
	slug: string;
	type: string;
	status: string;
	catalog_visibility: string;
	featured: boolean;
	description: string;
	short_description: string;
	regular_price: string;
	sale_price: string;
	schedule_sale: boolean;
	date_on_sale_from: string;
	date_on_sale_to: string;
	tax_status: string;
	tax_class: string;
	sku: string;
	manage_stock: boolean;
	stock_quantity: string;
	stock_status: string;
	backorders: string;
	low_stock_amount: string;
	sold_individually: boolean;
	virtual: boolean;
	downloadable: boolean;
	weight: string;
	length: string;
	width: string;
	height: string;
	shipping_class: string;
	external_url: string;
	button_text: string;
	images: EditorImage[];
	categories: number[];
	tags: string;
	attributes: ProductAttribute[];
	purchase_note: string;
	menu_order: number;
	reviews_allowed: boolean;
	upsell_ids: number[];
	cross_sell_ids: number[];
	grouped_products: number[];
	downloads: DownloadFile[];
	download_limit: string;
	download_expiry: string;
};

const EMPTY_FORM: Form = {
	name: '',
	slug: '',
	type: 'simple',
	status: 'draft',
	catalog_visibility: 'visible',
	featured: false,
	description: '',
	short_description: '',
	regular_price: '',
	sale_price: '',
	schedule_sale: false,
	date_on_sale_from: '',
	date_on_sale_to: '',
	tax_status: 'taxable',
	tax_class: '',
	sku: '',
	manage_stock: false,
	stock_quantity: '',
	stock_status: 'instock',
	backorders: 'no',
	low_stock_amount: '',
	sold_individually: false,
	virtual: false,
	downloadable: false,
	weight: '',
	length: '',
	width: '',
	height: '',
	shipping_class: '',
	external_url: '',
	button_text: '',
	images: [],
	categories: [],
	tags: '',
	attributes: [],
	purchase_note: '',
	menu_order: 0,
	reviews_allowed: true,
	upsell_ids: [],
	cross_sell_ids: [],
	grouped_products: [],
	downloads: [],
	download_limit: '',
	download_expiry: '',
};

type Errors = Partial<Record<'name' | 'sale_price' | 'date_on_sale_to' | 'external_url' | 'attributes', string>>;

export const ProductEditor = () => {
	const navigate = useNavigate();
	const confirm = useConfirm();
	const { notify } = useNotify();
	const pickMedia = useMediaPicker();
	const { adminUrl } = useWpData();
	const { store, currency, wc, toDecimal, can } = useWoo();
	const queryClient = useQueryClient();

	const routeId = Number(useParams().id) || 0;
	// After creating a product the editor keeps running, now bound to the saved id.
	const [id, setId] = useState(routeId);
	const isNew = !id;

	const [loading, setLoading] = useState(Boolean(routeId));
	const [notFound, setNotFound] = useState(false);
	const [saving, setSaving] = useState(false);
	const [product, setProduct] = useState<Product | null>(null);
	const [form, setForm] = useState<Form>(EMPTY_FORM);
	const [errors, setErrors] = useState<Errors>({});
	const [savedSnapshot, setSavedSnapshot] = useState('');
	const [variationsDirty, setVariationsDirty] = useState(false);
	const [categorySearch, setCategorySearch] = useState('');
	const [newCategory, setNewCategory] = useState('');
	const [descriptionTab, setDescriptionTab] = useState<'description' | 'short'>('description');

	const variationsRef = useRef<VariationsHandle>(null);
	const { data: categories = [] } = useCategories();
	const { data: shippingClasses = [] } = useShippingClasses();

	const snapshot = JSON.stringify(form);
	const isDirty = savedSnapshot !== '' && (snapshot !== savedSnapshot || variationsDirty);

	useUnsavedChanges(isDirty && !saving);

	const isVariable = form.type === 'variable';
	const isExternal = form.type === 'external';
	const isGrouped = form.type === 'grouped';
	const hasDownloads = form.downloadable && form.type === 'simple';
	const hasPrice = !isVariable && !isGrouped;
	const hasInventory = !isExternal && !isGrouped;
	const hasShipping = !form.virtual && !isExternal && !isGrouped;
	const featuredImage = form.images[0] ?? null;
	const gallery = form.images.slice(1);

	const attributesDirty = savedSnapshot !== '' && JSON.stringify(form.attributes) !== JSON.stringify((JSON.parse(savedSnapshot) as Form).attributes);

	const localPrice = (value: string | number | null | undefined) =>
		value === '' || value === null || value === undefined ? '' : String(value).replace('.', currency.decimal_separator || ',');

	const classicUrl = isNew ? `${adminUrl}post-new.php?post_type=product&fd_classic=1` : `${adminUrl}post.php?post=${id}&action=edit&fd_classic=1`;

	const fillForm = (data: Product) =>
		setForm({
			name: decodeHtml(data.name),
			slug: data.slug || '',
			type: data.type || 'simple',
			status: data.status === ('auto-draft' as string) ? 'draft' : data.status || 'draft',
			catalog_visibility: data.catalog_visibility || 'visible',
			featured: Boolean(data.featured),
			description: data.description || '',
			short_description: data.short_description || '',
			regular_price: localPrice(data.regular_price),
			sale_price: localPrice(data.sale_price),
			schedule_sale: Boolean(data.date_on_sale_from || data.date_on_sale_to),
			date_on_sale_from: data.date_on_sale_from ? String(data.date_on_sale_from).slice(0, 10) : '',
			date_on_sale_to: data.date_on_sale_to ? String(data.date_on_sale_to).slice(0, 10) : '',
			tax_status: data.tax_status || 'taxable',
			tax_class: data.tax_class || '',
			sku: data.sku || '',
			manage_stock: data.manage_stock === true,
			stock_quantity: data.stock_quantity === null || data.stock_quantity === undefined ? '' : String(data.stock_quantity),
			stock_status: data.stock_status || 'instock',
			backorders: data.backorders || 'no',
			low_stock_amount: data.low_stock_amount === null || data.low_stock_amount === undefined ? '' : String(data.low_stock_amount),
			sold_individually: Boolean(data.sold_individually),
			virtual: Boolean(data.virtual),
			downloadable: Boolean(data.downloadable),
			weight: data.weight || '',
			length: data.dimensions?.length || '',
			width: data.dimensions?.width || '',
			height: data.dimensions?.height || '',
			shipping_class: data.shipping_class || '',
			external_url: data.external_url || '',
			button_text: data.button_text || '',
			images: (data.images ?? []).map((image) => ({ id: image.id ?? 0, src: image.src, alt: image.alt || '' })),
			categories: (data.categories ?? []).map((category) => category.id),
			tags: (data.tags ?? []).map((tag) => decodeHtml(tag.name)).join(', '),
			attributes: (data.attributes ?? []).map((attribute) => ({ ...attribute, options: [...(attribute.options ?? [])] })),
			purchase_note: data.purchase_note || '',
			menu_order: data.menu_order ?? 0,
			reviews_allowed: data.reviews_allowed !== false,
			upsell_ids: [...(data.upsell_ids ?? [])],
			cross_sell_ids: [...(data.cross_sell_ids ?? [])],
			grouped_products: [...(data.grouped_products ?? [])],
			downloads: (data.downloads ?? []).map((file) => ({ id: file.id || '', name: file.name || '', file: file.file || '' })),
			download_limit: data.download_limit === -1 || data.download_limit === undefined ? '' : String(data.download_limit),
			download_expiry: data.download_expiry === -1 || data.download_expiry === undefined ? '' : String(data.download_expiry),
		});

	useEffect(() => {
		if (!routeId) {
			setSavedSnapshot(JSON.stringify(EMPTY_FORM));
			return;
		}

		let active = true;
		setLoading(true);

		wc<Product>(`products/${routeId}`)
			.then((response) => {
				if (!active) {
					return;
				}

				const data = response.data as unknown as Product;

				if (!data) {
					setNotFound(true);
				} else {
					setProduct(data);
					fillForm(data);
				}

				setLoading(false);
			})
			.catch(() => {
				if (active) {
					setNotFound(true);
					setLoading(false);
				}
			});

		return () => {
			active = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [routeId]);

	// The snapshot has to be taken after the form state settles, otherwise everything looks dirty.
	useEffect(() => {
		if (product) {
			setSavedSnapshot(JSON.stringify(form));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [product]);

	const set = (patch: Partial<Form>) => setForm((current) => ({ ...current, ...patch }));

	const categoryTree = useMemo(() => {
		const byParent = new Map<number, Category[]>();

		categories.forEach((category) => {
			const siblings = byParent.get(category.parent) ?? [];
			siblings.push(category);
			byParent.set(category.parent, siblings);
		});

		const list: (Category & { label: string; depth: number })[] = [];

		const walk = (parent: number, depth: number) => {
			[...(byParent.get(parent) ?? [])]
				.sort((a, b) => decodeHtml(a.name).localeCompare(decodeHtml(b.name)))
				.forEach((category) => {
					list.push({ ...category, label: decodeHtml(category.name), depth });
					walk(category.id, depth + 1);
				});
		};

		walk(0, 0);

		const term = categorySearch.trim().toLowerCase();

		return term ? list.filter((category) => category.label.toLowerCase().includes(term)).map((category) => ({ ...category, depth: 0 })) : list;
	}, [categories, categorySearch]);

	const validate = () => {
		const next: Errors = {};

		if (!form.name.trim()) {
			next.name = __('The product name is required.');
		}

		if (hasPrice && form.sale_price !== '' && form.regular_price !== '' && Number(toDecimal(form.sale_price)) >= Number(toDecimal(form.regular_price))) {
			next.sale_price = __('The sale price must be lower than the regular price.');
		}

		if (form.schedule_sale && form.date_on_sale_from && form.date_on_sale_to && form.date_on_sale_to < form.date_on_sale_from) {
			next.date_on_sale_to = __('The end date must be after the start date.');
		}

		if (isExternal && form.external_url && !/^https?:\/\//i.test(form.external_url)) {
			next.external_url = __('Enter a valid URL starting with http:// or https://.');
		}

		if (form.attributes.some((attribute) => !attribute.id && !String(attribute.name).trim())) {
			next.attributes = __('Give every custom attribute a name.');
		}

		setErrors(next);

		return !Object.keys(next).length;
	};

	const buildPayload = (status: string): Record<string, unknown> => {
		const existingTags = product?.tags ?? [];

		const payload: Record<string, unknown> = {
			name: form.name.trim(),
			type: form.type,
			status,
			catalog_visibility: form.catalog_visibility,
			featured: form.featured,
			description: form.description,
			short_description: form.short_description,
			sku: form.sku.trim(),
			tax_status: form.tax_status,
			tax_class: form.tax_class,
			sold_individually: form.sold_individually,
			virtual: form.virtual,
			downloadable: form.downloadable,
			weight: String(form.weight || ''),
			dimensions: { length: String(form.length || ''), width: String(form.width || ''), height: String(form.height || '') },
			shipping_class: form.shipping_class,
			images: form.images.map((image, position) => ({ id: image.id, position })),
			categories: form.categories.map((categoryId) => ({ id: categoryId })),
			tags: form.tags
				.split(',')
				.map((name) => name.trim())
				.filter(Boolean)
				.map((name) => {
					const existing = existingTags.find((tag) => decodeHtml(tag.name).toLowerCase() === name.toLowerCase());

					return existing ? { id: existing.id } : { name };
				}),
			attributes: form.attributes.map((attribute, position) => ({
				...(attribute.id ? { id: attribute.id } : {}),
				name: String(attribute.name || '').trim(),
				position,
				visible: Boolean(attribute.visible),
				variation: isVariable && Boolean(attribute.variation),
				options: attribute.options,
			})),
			purchase_note: form.purchase_note,
			menu_order: Number(form.menu_order) || 0,
			reviews_allowed: form.reviews_allowed,
			upsell_ids: form.upsell_ids,
			cross_sell_ids: form.cross_sell_ids,
		};

		if (isGrouped) {
			payload.grouped_products = form.grouped_products;
		}

		if (hasDownloads) {
			payload.downloads = form.downloads
				.filter((file) => file.file.trim())
				.map((file) => ({ ...(file.id ? { id: file.id } : {}), name: file.name.trim() || file.file.split('/').pop(), file: file.file.trim() }));
			payload.download_limit = form.download_limit === '' ? -1 : Number(form.download_limit);
			payload.download_expiry = form.download_expiry === '' ? -1 : Number(form.download_expiry);
		}

		if (!isNew && form.slug.trim()) {
			payload.slug = form.slug.trim();
		}

		if (hasPrice) {
			payload.regular_price = toDecimal(form.regular_price);
			payload.sale_price = toDecimal(form.sale_price);
			payload.date_on_sale_from = form.schedule_sale && form.date_on_sale_from ? `${form.date_on_sale_from}T00:00:00` : '';
			payload.date_on_sale_to = form.schedule_sale && form.date_on_sale_to ? `${form.date_on_sale_to}T23:59:59` : '';
		}

		if (isExternal) {
			payload.external_url = form.external_url.trim();
			payload.button_text = form.button_text.trim();
		}

		if (hasInventory) {
			payload.manage_stock = form.manage_stock;

			if (form.manage_stock) {
				payload.stock_quantity = form.stock_quantity === '' ? null : Number(form.stock_quantity);
				payload.backorders = form.backorders;
				payload.low_stock_amount = form.low_stock_amount === '' ? null : Number(form.low_stock_amount);
			} else if (!isVariable) {
				payload.stock_status = form.stock_status;
			}
		}

		return payload;
	};

	const save = async (status = form.status) => {
		if (!validate()) {
			notify({ title: __('Please review the highlighted fields'), tone: 'error' });
			return;
		}

		setSaving(true);

		try {
			const variationsSaved = variationsRef.current ? await variationsRef.current.save() : true;
			const response = isNew
				? await wc<Product>('products', { method: 'POST', data: buildPayload(status) })
				: await wc<Product>(`products/${id}`, { method: 'PUT', data: buildPayload(status) });

			const data = response.data as unknown as Product;

			if (!data) {
				return;
			}

			setProduct(data);
			fillForm(data);
			setVariationsDirty(false);
			setId(data.id);
			queryClient.invalidateQueries({ queryKey: wooKeys.productsRoot });
			queryClient.invalidateQueries({ queryKey: wooKeys.summary });

			if (variationsSaved) {
				notify({ title: status === 'publish' && data.status === 'publish' ? __('Product saved and published') : __('Product saved'), tone: 'success' });
			}

			if (isNew) {
				navigate(`/product/${data.id}`, { replace: true });
			}
		} finally {
			setSaving(false);
		}
	};

	const chooseFeatured = async () => {
		const [image] = await pickMedia({ title: __('Product image'), button: __('Set product image') });

		if (image) {
			set({ images: [{ id: image.id, src: image.src, alt: image.alt }, ...form.images.slice(1).filter((item) => item.id !== image.id)] });
		}
	};

	const addGallery = async () => {
		const images = await pickMedia({ title: __('Product gallery'), button: __('Add to gallery'), multiple: true });

		if (!images.length) {
			return;
		}

		const ids = new Set(form.images.map((image) => image.id));

		// Without a featured image the first gallery image becomes the product image.
		set({ images: [...form.images, ...images.filter((image) => !ids.has(image.id)).map((image) => ({ id: image.id, src: image.src, alt: image.alt }))] });
	};

	const chooseDownloadFile = async (index: number) => {
		const [file] = await pickMedia({ title: __('Downloadable file'), button: __('Use file'), type: '' });

		if (!file) {
			return;
		}

		set({ downloads: form.downloads.map((item, itemIndex) => (itemIndex === index ? { ...item, file: file.url, name: item.name || file.title } : item)) });
	};

	const createCategory = async () => {
		const name = newCategory.trim();

		if (!name) {
			return;
		}

		const created = (await wc<Category>('products/categories', { method: 'POST', data: { name } })).data as unknown as Category;

		if (!created) {
			return;
		}

		queryClient.setQueryData<Category[]>(wooKeys.categories, (current) => [...(current ?? []), created]);
		set({ categories: [...form.categories, created.id] });
		setNewCategory('');
	};

	const trashProduct = async () => {
		const confirmed = await confirm({ title: __('Move to trash?'), message: form.name, confirmLabel: __('Move to trash'), variant: 'danger' });

		if (!confirmed) {
			return;
		}

		await wc(`products/${id}`, { method: 'DELETE' });
		setSavedSnapshot(JSON.stringify(form));
		setVariationsDirty(false);
		notify({ title: __('Product moved to the trash'), tone: 'success' });
		queryClient.invalidateQueries({ queryKey: wooKeys.productsRoot });
		navigate('/');
	};

	const leave = async (to: string) => {
		if (isDirty && !saving) {
			const confirmed = await confirm({
				title: __('Discard unsaved changes?'),
				message: __('Your changes to this product have not been saved.'),
				confirmLabel: __('Discard changes'),
				variant: 'danger',
			});

			if (!confirmed) {
				return;
			}
		}

		navigate(to);
	};

	if (loading) {
		return (
			<div>
				<div className="mb-6 space-y-2">
					<Skeleton className="h-4 w-40" />
					<Skeleton className="h-7 w-72" />
				</div>
				<div className="grid gap-6 xl:grid-cols-3">
					<div className="space-y-6 xl:col-span-2">
						<Skeleton className="h-72 w-full rounded-2xl" />
						<Skeleton className="h-56 w-full rounded-2xl" />
					</div>
					<div className="space-y-6">
						<Skeleton className="h-48 w-full rounded-2xl" />
						<Skeleton className="h-64 w-full rounded-2xl" />
					</div>
				</div>
			</div>
		);
	}

	if (notFound) {
		return (
			<Card>
				<EmptyState icon="search_off" title={__('Product not found')} description={__('The product may have been deleted or you do not have permission to edit it.')}>
					<Button icon="arrow_back" variant="outline" onClick={() => navigate('/')}>
						{__('Back to products')}
					</Button>
				</EmptyState>
			</Card>
		);
	}

	const title = isNew ? __('Add product') : form.name || __('(no title)');

	const typeOptions = store.product_types.length
		? store.product_types
		: [
				{ value: 'simple', label: __('Simple product') },
				{ value: 'variable', label: __('Variable product') },
				{ value: 'grouped', label: __('Grouped product') },
				{ value: 'external', label: __('External/Affiliate product') },
			];

	const stockOptions = store.stock_statuses.length
		? store.stock_statuses
		: [
				{ value: 'instock', label: __('In stock') },
				{ value: 'outofstock', label: __('Out of stock') },
				{ value: 'onbackorder', label: __('On backorder') },
			];

	const moreActions: MenuItem[] = [
		...(product?.permalink ? [{ label: form.status === 'publish' ? __('View in store') : __('Preview'), icon: 'open_in_new', href: product.permalink, target: '_blank' }] : []),
		{ label: __('Open in classic editor'), icon: 'edit_note', href: classicUrl },
		...(!isNew && can('delete_products') ? [{ separator: true as const }, { label: __('Move to trash'), icon: 'delete', danger: true, onSelect: trashProduct }] : []),
	];

	return (
		<div>
			<form
				noValidate
				onSubmit={(event) => {
					event.preventDefault();
					save();
				}}
			>
				<PageHeader
					title={
						<span className="flex flex-wrap items-center gap-3">
							{title}
							{isDirty ? (
								<Badge color="warning" size="md" dot>
									{__('Unsaved changes')}
								</Badge>
							) : null}
						</span>
					}
					breadcrumbs={[{ label: __('Products'), onClick: () => leave('/') }, { label: title }]}
					actions={
						<>
							<DropdownMenu items={moreActions} width="w-56" trigger={<Button variant="outline" icon="more_horiz" iconOnly aria-label={__('More actions')} />} />
							{form.status !== 'publish' || product?.status !== 'publish' ? (
								<Button variant="outline" loading={saving && form.status !== 'publish'} onClick={() => save(form.status === 'publish' ? 'draft' : form.status)}>
									{__('Save draft')}
								</Button>
							) : null}
							<Button loading={saving} icon="check" onClick={() => save('publish')}>
								{form.status === 'publish' && product?.status === 'publish' ? __('Update') : __('Publish')}
							</Button>
						</>
					}
				/>

				{!isNew && product?.type && !['simple', 'variable', 'grouped', 'external'].includes(product.type) ? (
					<Alert
						variant="warning"
						className="mb-6"
						title={__('This product type is managed by an extension')}
						message={__('Some fields may only be available in the classic editor.')}
					/>
				) : null}

				{store.product_editor_extensions?.length ? (
					<Alert
						variant="info"
						className="mb-6"
						title={__('Some extensions add fields only available in the classic editor')}
						message={store.product_editor_extensions.map((extension) => extension.label).join(', ')}
						actions={
							<Button size="xs" variant="outline" icon="edit_note" href={classicUrl}>
								{__('Open in classic editor')}
							</Button>
						}
					/>
				) : null}

				<div className="grid gap-6 xl:grid-cols-3">
					<div className="min-w-0 space-y-6 xl:col-span-2">
						<Card title={__('General')}>
							<div className="space-y-5">
								<Input value={form.name} onChange={(event) => set({ name: event.target.value })} label={__('Product name')} error={errors.name} required />
								{!isNew ? <Input value={form.slug} onChange={(event) => set({ slug: event.target.value })} label={__('Slug')} hint={product?.permalink} /> : null}

								<div>
									<Tabs
										value={descriptionTab}
										onChange={setDescriptionTab}
										className="mb-3"
										ariaLabel={__('Descriptions')}
										items={[
											{ value: 'description', label: __('Description') },
											{ value: 'short', label: __('Short description') },
										]}
									/>
									{descriptionTab === 'description' ? (
										<RichText key="description" value={form.description} onChange={(description) => set({ description })} placeholder={__('Describe the product in detail…')} />
									) : (
										<RichText
											key="short"
											value={form.short_description}
											onChange={(short_description) => set({ short_description })}
											placeholder={__('A short summary shown next to the product image…')}
											minHeight="8rem"
										/>
									)}
								</div>
							</div>
						</Card>

						<Card title={__('Pricing')}>
							<div className="space-y-5">
								<Select value={form.type} onChange={(next) => set({ type: next })} options={typeOptions} label={__('Product type')} className="sm:max-w-xs" />

								{hasPrice ? (
									<>
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
										<Switch checked={form.schedule_sale} onCheckedChange={(schedule_sale) => set({ schedule_sale })} label={__('Schedule sale')} />
										{form.schedule_sale ? (
											<div className="grid gap-4 sm:grid-cols-2">
												<Input value={form.date_on_sale_from} onChange={(event) => set({ date_on_sale_from: event.target.value })} type="date" label={__('Sale starts')} />
												<Input
													value={form.date_on_sale_to}
													onChange={(event) => set({ date_on_sale_to: event.target.value })}
													type="date"
													label={__('Sale ends')}
													error={errors.date_on_sale_to}
												/>
											</div>
										) : null}
									</>
								) : isVariable ? (
									<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('Prices are set on each variation.')}</p>
								) : (
									<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('Grouped products take their prices from the child products.')}</p>
								)}

								{isExternal ? (
									<div className="grid gap-4 sm:grid-cols-2">
										<Input
											value={form.external_url}
											onChange={(event) => set({ external_url: event.target.value })}
											type="url"
											label={__('Product URL')}
											placeholder="https://"
											error={errors.external_url}
										/>
										<Input value={form.button_text} onChange={(event) => set({ button_text: event.target.value })} label={__('Button text')} placeholder={__('Buy product')} />
									</div>
								) : null}

								{store.taxes_enabled ? (
									<div className="grid gap-4 sm:grid-cols-2">
										<Select
											value={form.tax_status}
											onChange={(next) => set({ tax_status: next })}
											options={[
												{ value: 'taxable', label: __('Taxable') },
												{ value: 'shipping', label: __('Shipping only') },
												{ value: 'none', label: __('None') },
											]}
											label={__('Tax status')}
										/>
										<Select value={form.tax_class} onChange={(next) => set({ tax_class: next })} options={store.tax_classes ?? []} label={__('Tax class')} />
									</div>
								) : null}
							</div>
						</Card>

						{hasInventory ? (
							<Card title={__('Inventory')}>
								<div className="space-y-5">
									<Input
										value={form.sku}
										onChange={(event) => set({ sku: event.target.value })}
										label={__('SKU')}
										hint={__('Stock keeping unit, unique per product.')}
										className="sm:max-w-xs"
									/>
									<Switch
										checked={form.manage_stock}
										onCheckedChange={(manage_stock) => set({ manage_stock })}
										label={isVariable ? __('Track stock at product level') : __('Track stock quantity')}
									/>
									{form.manage_stock ? (
										<div className="grid gap-4 sm:grid-cols-3">
											<Input value={form.stock_quantity} onChange={(event) => set({ stock_quantity: event.target.value })} type="number" step={1} label={__('Quantity')} />
											<Select
												value={form.backorders}
												onChange={(next) => set({ backorders: next })}
												options={[
													{ value: 'no', label: __('Do not allow') },
													{ value: 'notify', label: __('Allow, but notify customer') },
													{ value: 'yes', label: __('Allow') },
												]}
												label={__('Backorders')}
											/>
											<Input
												value={form.low_stock_amount}
												onChange={(event) => set({ low_stock_amount: event.target.value })}
												type="number"
												min={0}
												step={1}
												label={__('Low stock threshold')}
												placeholder={String(store.low_stock_amount)}
											/>
										</div>
									) : !isVariable ? (
										<Select value={form.stock_status} onChange={(next) => set({ stock_status: next })} options={stockOptions} label={__('Stock status')} className="sm:max-w-xs" />
									) : null}
									<Checkbox checked={form.sold_individually} onCheckedChange={(sold_individually) => set({ sold_individually })} label={__('Limit purchases to 1 item per order')} />
								</div>
							</Card>
						) : null}

						{!isExternal && !isGrouped ? (
							<Card title={__('Shipping')}>
								<div className="space-y-5">
									<div className="flex flex-wrap gap-6">
										<Switch checked={form.virtual} onCheckedChange={(virtual) => set({ virtual })} label={__('Virtual product (no shipping)')} />
										<Switch checked={form.downloadable} onCheckedChange={(downloadable) => set({ downloadable })} label={__('Downloadable')} />
									</div>
									{form.downloadable && isVariable ? <Alert variant="info" message={__('Downloadable files of variable products are managed in the classic editor.')} /> : null}
									{hasDownloads ? (
										<div className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
											<p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">{__('Downloadable files')}</p>
											{form.downloads.map((file, index) => (
												<div key={index} className="grid items-end gap-3 sm:grid-cols-[1fr_2fr_auto]">
													<Input
														value={file.name}
														onChange={(event) => set({ downloads: form.downloads.map((item, itemIndex) => (itemIndex === index ? { ...item, name: event.target.value } : item)) })}
														label={__('File name')}
													/>
													<Input
														value={file.file}
														onChange={(event) => set({ downloads: form.downloads.map((item, itemIndex) => (itemIndex === index ? { ...item, file: event.target.value } : item)) })}
														type="url"
														label={__('File URL')}
														placeholder="https://"
													/>
													<div className="flex gap-1">
														<Button variant="outline" icon="attach_file" iconOnly aria-label={__('Choose file')} onClick={() => chooseDownloadFile(index)} />
														<Button
															variant="ghost"
															icon="delete"
															iconOnly
															aria-label={__('Remove file')}
															onClick={() => set({ downloads: form.downloads.filter((_, itemIndex) => itemIndex !== index) })}
														/>
													</div>
												</div>
											))}
											<Button size="sm" variant="outline" icon="add" onClick={() => set({ downloads: [...form.downloads, { id: '', name: '', file: '' }] })}>
												{__('Add file')}
											</Button>
											<div className="grid gap-4 sm:grid-cols-2">
												<Input
													value={form.download_limit}
													onChange={(event) => set({ download_limit: event.target.value })}
													type="number"
													min={0}
													step={1}
													label={__('Download limit')}
													placeholder={__('Unlimited')}
												/>
												<Input
													value={form.download_expiry}
													onChange={(event) => set({ download_expiry: event.target.value })}
													type="number"
													min={0}
													step={1}
													label={__('Download expiry (days)')}
													placeholder={__('Never')}
												/>
											</div>
										</div>
									) : null}
									{hasShipping ? (
										<>
											<div className="grid gap-4 sm:grid-cols-4">
												<Input value={form.weight} onChange={(event) => set({ weight: event.target.value })} label={__('Weight')} suffix={store.weight_unit} inputMode="decimal" />
												<Input value={form.length} onChange={(event) => set({ length: event.target.value })} label={__('Length')} suffix={store.dimension_unit} inputMode="decimal" />
												<Input value={form.width} onChange={(event) => set({ width: event.target.value })} label={__('Width')} suffix={store.dimension_unit} inputMode="decimal" />
												<Input value={form.height} onChange={(event) => set({ height: event.target.value })} label={__('Height')} suffix={store.dimension_unit} inputMode="decimal" />
											</div>
											<Select
												value={form.shipping_class}
												onChange={(next) => set({ shipping_class: next })}
												options={[{ value: '', label: __('No shipping class') }, ...shippingClasses]}
												label={__('Shipping class')}
												className="sm:max-w-xs"
											/>
										</>
									) : null}
								</div>
							</Card>
						) : null}

						{!isGrouped ? (
							<Card title={__('Attributes')}>
								{errors.attributes ? <Alert variant="error" title={errors.attributes} className="mb-4" /> : null}
								<ProductAttributes attributes={form.attributes} onChange={(attributes) => set({ attributes })} isVariable={isVariable} />
							</Card>
						) : null}

						{isVariable ? (
							<Card title={__('Variations')}>
								{isNew || product?.type !== 'variable' ? <Alert variant="info" message={__('Save the product to start adding variations.')} /> : null}
								{!isNew && product?.type === 'variable' && attributesDirty ? (
									<Alert variant="warning" className="mb-4" message={__('Save the product to use the attribute changes in the variations.')} />
								) : null}
								{!isNew && product?.type === 'variable' ? (
									<ProductVariationsEditor
										ref={variationsRef}
										productId={product.id}
										attributes={product.attributes ?? []}
										onDirtyChange={setVariationsDirty}
									/>
								) : null}
							</Card>
						) : null}

						<Card title={__('Linked products')}>
							<div className="space-y-5">
								{isGrouped ? (
									<div>
										<p className="mb-2 text-theme-sm font-medium text-gray-700 dark:text-gray-300">{__('Grouped products')}</p>
										<ProductPicker
											ids={form.grouped_products}
											onChange={(grouped_products) => set({ grouped_products })}
											exclude={id ? [id] : []}
											types={['simple', 'variable', 'external']}
										/>
									</div>
								) : null}
								<div>
									<p className="mb-1 text-theme-sm font-medium text-gray-700 dark:text-gray-300">{__('Upsells')}</p>
									<p className="mb-2 text-theme-xs text-gray-500 dark:text-gray-400">{__('Products recommended instead of this one, usually more profitable or better quality.')}</p>
									<ProductPicker ids={form.upsell_ids} onChange={(upsell_ids) => set({ upsell_ids })} exclude={id ? [id] : []} />
								</div>
								<div>
									<p className="mb-1 text-theme-sm font-medium text-gray-700 dark:text-gray-300">{__('Cross-sells')}</p>
									<p className="mb-2 text-theme-xs text-gray-500 dark:text-gray-400">{__('Products promoted in the cart based on this product.')}</p>
									<ProductPicker ids={form.cross_sell_ids} onChange={(cross_sell_ids) => set({ cross_sell_ids })} exclude={id ? [id] : []} />
								</div>
							</div>
						</Card>

						<Card title={__('Advanced')}>
							<div className="space-y-5">
								<Textarea
									value={form.purchase_note}
									onChange={(event) => set({ purchase_note: event.target.value })}
									rows={3}
									label={__('Purchase note')}
									hint={__('Sent to the customer after purchase.')}
								/>
								<div className="grid gap-4 sm:grid-cols-2">
									<Input value={String(form.menu_order)} onChange={(event) => set({ menu_order: Number(event.target.value) || 0 })} type="number" step={1} label={__('Menu order')} />
								</div>
								<Checkbox checked={form.reviews_allowed} onCheckedChange={(reviews_allowed) => set({ reviews_allowed })} label={__('Enable reviews')} />
							</div>
						</Card>
					</div>

					<div className="min-w-0 space-y-6">
						<Card title={__('Publish')}>
							<div className="space-y-4">
								<Select
									value={form.status}
									onChange={(next) => set({ status: next })}
									options={[
										{ value: 'publish', label: __('Published') },
										{ value: 'draft', label: __('Draft') },
										{ value: 'pending', label: __('Pending review') },
										{ value: 'private', label: __('Private') },
									]}
									label={__('Status')}
								/>
								<Select
									value={form.catalog_visibility}
									onChange={(next) => set({ catalog_visibility: next })}
									options={[
										{ value: 'visible', label: __('Shop and search results') },
										{ value: 'catalog', label: __('Shop only') },
										{ value: 'search', label: __('Search results only') },
										{ value: 'hidden', label: __('Hidden') },
									]}
									label={__('Catalog visibility')}
								/>
								<Switch checked={form.featured} onCheckedChange={(featured) => set({ featured })} label={__('Featured product')} />
								{product?.date_modified ? (
									<p className="text-theme-xs text-gray-500 dark:text-gray-400">
										{__('Last modified')}: {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(product.date_modified))}
									</p>
								) : null}
							</div>
						</Card>

						<Card title={__('Images')}>
							{!featuredImage ? (
								<button
									type="button"
									className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-theme-sm text-gray-500 transition-colors hover:border-brand-500 hover:text-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
									onClick={chooseFeatured}
								>
									<Icon name="image" className="text-title-sm" />
									{__('Set product image')}
								</button>
							) : (
								<div className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
									<img src={featuredImage.src} alt={featuredImage.alt} className="aspect-square w-full object-cover" />
									<div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-gray-900/60 p-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
										<Button size="xs" variant="outline" onClick={chooseFeatured}>
											{__('Replace')}
										</Button>
										<Button
											size="xs"
											variant="danger"
											icon="delete"
											iconOnly
											aria-label={__('Remove image')}
											onClick={() => set({ images: form.images.filter((_, index) => index !== 0) })}
										/>
									</div>
								</div>
							)}

							<div className="mt-4">
								<p className="mb-2 text-theme-sm font-medium text-gray-700 dark:text-gray-300">{__('Gallery')}</p>
								<div className="grid grid-cols-4 gap-2">
									{gallery.map((image, index) => (
										<div key={image.id} className="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
											<img src={image.src} alt={image.alt} className="aspect-square w-full object-cover" />
											<div className="absolute inset-0 flex items-center justify-center gap-1 bg-gray-900/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
												<button
													type="button"
													className="rounded-full bg-white/90 p-1 text-gray-700 hover:text-brand-500"
													aria-label={__('Use as product image')}
													onClick={() => set({ images: [form.images[index + 1], ...form.images.filter((_, itemIndex) => itemIndex !== index + 1)] })}
												>
													<Icon name="star_full" className="text-theme-sm" />
												</button>
												<button
													type="button"
													className="rounded-full bg-white/90 p-1 text-gray-700 hover:text-error-500"
													aria-label={__('Remove image')}
													onClick={() => set({ images: form.images.filter((_, itemIndex) => itemIndex !== index + 1) })}
												>
													<Icon name="close" className="text-theme-sm" />
												</button>
											</div>
										</div>
									))}
									<button
										type="button"
										className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-gray-300 text-gray-400 transition-colors hover:border-brand-500 hover:text-brand-500 dark:border-gray-700"
										aria-label={__('Add gallery images')}
										onClick={addGallery}
									>
										<Icon name="add" className="text-theme-xl" />
									</button>
								</div>
							</div>
						</Card>

						<Card title={__('Categories')}>
							{categories.length > 8 ? (
								<SearchInput value={categorySearch} onChange={setCategorySearch} size="sm" className="mb-3" placeholder={__('Search categories')} />
							) : null}
							<div className="flex max-h-64 flex-col items-start gap-2 overflow-y-auto pe-1 custom-scrollbar">
								{categoryTree.map((category) => (
									<div key={category.id} style={{ paddingInlineStart: `${category.depth * 1.25}rem` }}>
										<Checkbox
											checked={form.categories.includes(category.id)}
											onCheckedChange={(checked) =>
												set({ categories: checked ? [...form.categories, category.id] : form.categories.filter((categoryId) => categoryId !== category.id) })
											}
											label={category.label}
											size="sm"
										/>
									</div>
								))}
								{!categoryTree.length ? <p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('No categories found.')}</p> : null}
							</div>
							<div className="mt-3 flex gap-2">
								<Input
									value={newCategory}
									onChange={(event) => setNewCategory(event.target.value)}
									onKeyDown={(event) => {
										if (event.key === 'Enter') {
											event.preventDefault();
											createCategory();
										}
									}}
									size="sm"
									className="flex-1"
									placeholder={__('New category')}
									aria-label={__('New category')}
								/>
								<Button size="sm" variant="outline" icon="add" iconOnly aria-label={__('Add category')} onClick={createCategory} />
							</div>
						</Card>

						<Card title={__('Tags')}>
							<Input value={form.tags} onChange={(event) => set({ tags: event.target.value })} hint={__('Separate tags with commas.')} aria-label={__('Tags')} />
						</Card>
					</div>
				</div>
			</form>
		</div>
	);
};
