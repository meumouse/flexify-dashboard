import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useWpData } from '@/react/app/WpDataProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { useQueryFilters } from '@/react/hooks/useQueryFilters';
import { decodeHtml } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import {
	Badge,
	Button,
	DataTable,
	DropdownMenu,
	Icon,
	Input,
	PageHeader,
	Pagination,
	SearchInput,
	Select,
	StatStrip,
	Switch,
	TableCard,
	Tabs,
	Tooltip,
	type ActiveFilter,
	type Column,
	type MenuItem,
	type RowKey,
	type StatItem,
} from '@/react/ui';
import { useCategories, useDuplicateProduct, useProducts, useProductsBulk, useProductsSummary, useTags, useUpdateProduct, type ProductListParams } from '@/react/woo/queries';
import { useWoo } from '@/react/woo/WooProvider';
import type { Product } from '@/react/woo/types';
import { BulkCategoryModal } from '@/react/features/products/BulkCategoryModal';
import { BulkPriceModal } from '@/react/features/products/BulkPriceModal';
import { ProductQuickEdit } from '@/react/features/products/ProductQuickEdit';
import { ProductVariations } from '@/react/features/products/ProductVariations';
import { categoryOptions, formatDate, statusBadges, stockBadge } from '@/react/features/products/productFormat';
import { useHiddenColumns } from '@/react/features/products/useHiddenColumns';

/**
 * Catalog screen: counters, filters, inline variations, quick edit and bulk actions.
 */

const DEFAULT_FILTERS = {
	status: 'any',
	search: '',
	category: '',
	type: '',
	stock_status: '',
	featured: '',
	low_stock: '',
	tag: '',
	min_price: '',
	max_price: '',
	page: 1,
	per_page: 20,
	orderby: 'date',
	order: 'desc',
};

const TOGGLEABLE_COLUMNS = ['categories', 'price', 'stock', 'status', 'date'];

export const ProductsList = () => {
	const navigate = useNavigate();
	const confirm = useConfirm();
	const { notify } = useNotify();
	const { adminUrl } = useWpData();
	const { store, currency, price, toDecimal, can } = useWoo();

	const { filters, setFilters } = useQueryFilters(DEFAULT_FILTERS);
	const [selected, setSelected] = useState<RowKey[]>([]);
	const [expanded, setExpanded] = useState<RowKey[]>([]);
	const [quickEdit, setQuickEdit] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });
	const [priceModalOpen, setPriceModalOpen] = useState(false);
	const [categoryModal, setCategoryModal] = useState<{ open: boolean; mode: 'add' | 'remove' }>({ open: false, mode: 'add' });
	const { hiddenColumns, toggleColumn } = useHiddenColumns('fd-products-hidden-columns', TOGGLEABLE_COLUMNS);

	const products = useProducts(filters as ProductListParams);
	const summaryQuery = useProductsSummary();
	const categoriesQuery = useCategories();
	const tagsQuery = useTags();
	const bulk = useProductsBulk();
	const duplicate = useDuplicateProduct();
	const updateProduct = useUpdateProduct();

	const rows = products.data?.data ?? [];
	const total = products.data?.totalItems ?? 0;
	const summary = summaryQuery.data;
	const categories = categoriesQuery.data ?? [];
	const badges = statusBadges();
	const isTrash = filters.status === 'trash';

	const hasActiveFilters = Boolean(
		filters.search || filters.category || filters.type || filters.stock_status || filters.featured || filters.low_stock || filters.tag || filters.min_price || filters.max_price
	);

	/** Changing anything but the page sends the user back to the first page. */
	const applyFilters = (patch: Partial<typeof DEFAULT_FILTERS>) => {
		setExpanded([]);
		setFilters({ ...patch, page: 1 });
	};

	const refresh = () => {
		setSelected([]);
		products.refetch();
		summaryQuery.refetch();
	};

	const statusTabs = useMemo(() => {
		const counts = (summary ?? {}) as Record<string, number | undefined>;

		return [
			{ value: 'any', label: __('All'), count: counts.total },
			{ value: 'publish', label: __('Published'), count: counts.publish },
			{ value: 'draft', label: __('Drafts'), count: counts.draft },
			{ value: 'pending', label: __('Pending'), count: counts.pending },
			{ value: 'private', label: __('Private'), count: counts.private },
			{ value: 'trash', label: __('Trash'), count: counts.trash },
		].filter((tab) => ['any', 'publish', 'draft'].includes(tab.value) || (tab.count ?? 0) > 0 || filters.status === tab.value);
	}, [filters.status, summary]);

	const statItems: StatItem[] = [
		{
			key: 'total',
			label: __('Total products'),
			value: (summary?.total ?? 0).toLocaleString(),
			clickable: true,
			active: filters.status === 'any' && !hasActiveFilters,
		},
		{
			key: 'publish',
			label: __('Published'),
			value: (summary?.publish ?? 0).toLocaleString(),
			tone: 'success',
			clickable: true,
			active: filters.status === 'publish' && !hasActiveFilters,
		},
		{
			key: 'outofstock',
			label: __('Out of stock'),
			value: (summary?.outofstock ?? 0).toLocaleString(),
			tone: summary?.outofstock ? 'error' : 'default',
			clickable: true,
			active: filters.stock_status === 'outofstock',
		},
		{
			key: 'lowstock',
			label: __('Low stock'),
			value: (summary?.lowstock ?? 0).toLocaleString(),
			tone: summary?.lowstock ? 'warning' : 'default',
			clickable: true,
			active: filters.low_stock === '1',
		},
	];

	const selectStat = (item: StatItem) => {
		const cleared = { ...DEFAULT_FILTERS, per_page: filters.per_page, orderby: filters.orderby, order: filters.order };

		if (item.key === 'total') {
			applyFilters({ ...cleared, status: 'any' });
		} else if (item.key === 'publish') {
			applyFilters({ ...cleared, status: 'publish' });
		} else if (item.key === 'outofstock') {
			applyFilters({ ...cleared, status: 'any', stock_status: 'outofstock' });
		} else if (item.key === 'lowstock') {
			applyFilters({ ...cleared, status: 'any', low_stock: '1' });
		}
	};

	const editUrl = (product: Product) => (store.product_editor ? `#/product/${product.id}` : `${adminUrl}post.php?post=${product.id}&action=edit`);

	const applyUpdatedProduct = (updated: Product) => {
		products.refetch();
		summaryQuery.refetch();

		return updated;
	};

	const toggleFeatured = async (product: Product) => {
		await updateProduct.mutateAsync({ id: product.id, data: { featured: !product.featured } });
		notify({ title: product.featured ? __('Removed from featured') : __('Marked as featured'), tone: 'success' });
		applyUpdatedProduct(product);
	};

	const runBulk = async (action: string, value?: unknown, ids: number[] = selected.map(Number)) => {
		if (!ids.length) {
			return;
		}

		const result = await bulk.mutateAsync({ ids, action, value });
		const { updated = [], failed = [] } = result ?? {};

		if (updated.length) {
			notify({ title: sprintf(__('%d product(s) updated'), updated.length), tone: 'success' });
		}

		if (failed.length) {
			notify({ title: sprintf(__('%d product(s) could not be updated'), failed.length), message: failed[0]?.message || '', tone: 'error' });
		}

		setSelected([]);
		refresh();
	};

	const confirmBulk = async (action: 'trash' | 'delete', ids: number[] = selected.map(Number)) => {
		const destructive = action === 'delete';

		const confirmed = await confirm({
			title: destructive ? __('Delete permanently?') : __('Move to trash?'),
			message: destructive
				? sprintf(__('%d product(s) will be permanently deleted. This action cannot be undone.'), ids.length)
				: sprintf(__('%d product(s) will be moved to the trash.'), ids.length),
			confirmLabel: destructive ? __('Delete permanently') : __('Move to trash'),
			variant: 'danger',
		});

		if (confirmed) {
			runBulk(action, undefined, ids);
		}
	};

	const duplicateProduct = async (product: Product) => {
		await duplicate.mutateAsync(product.id);
		notify({ title: __('Product duplicated'), message: __('The copy was saved as a draft.'), tone: 'success' });
		refresh();
	};

	const rowActions = (product: Product): MenuItem[] => {
		if (product.status === 'trash') {
			return [
				{ label: __('Restore'), icon: 'undo', onSelect: () => runBulk('restore', undefined, [product.id]) },
				{ separator: true },
				{ label: __('Delete permanently'), icon: 'delete', danger: true, onSelect: () => confirmBulk('delete', [product.id]) },
			];
		}

		const items: MenuItem[] = [
			{ label: __('Edit'), icon: 'edit', href: editUrl(product) },
			{ label: __('Quick edit'), icon: 'tune', onSelect: () => setQuickEdit({ open: true, product }) },
			{ label: __('Duplicate'), icon: 'content_copy', onSelect: () => duplicateProduct(product) },
		];

		if (product.permalink) {
			items.push({ label: __('View in store'), icon: 'open_in_new', href: product.permalink, target: '_blank' });
		}

		if (can('delete_products')) {
			items.push({ separator: true }, { label: __('Move to trash'), icon: 'delete', danger: true, onSelect: () => runBulk('trash', undefined, [product.id]) });
		}

		return items;
	};

	const allColumns: Column<Product>[] = [
		{
			key: 'name',
			label: __('Product'),
			sortable: true,
			cell: (row) => (
				<div className="flex items-center gap-3 sm:min-w-64">
					<div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
						{row.images?.[0]?.src ? (
							<img src={row.images[0].src} alt={row.images[0].alt || row.name} className="h-full w-full object-cover" loading="lazy" />
						) : (
							<Icon name="image" className="text-theme-xl text-gray-400" />
						)}
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<a href={editUrl(row)} className="truncate font-medium text-gray-800 hover:text-brand-500 dark:text-white/90 dark:hover:text-brand-400">
								{decodeHtml(row.name) || __('(no title)')}
							</a>
							{row.status !== 'trash' ? (
								<button
									type="button"
									className={`shrink-0 transition-colors ${row.featured ? 'text-warning-500' : 'text-gray-300 hover:text-warning-500 dark:text-gray-600'}`}
									aria-label={row.featured ? __('Remove from featured') : __('Mark as featured')}
									onClick={() => toggleFeatured(row)}
								>
									<Icon name={row.featured ? 'star_full' : 'star_empty'} className="text-theme-md" />
								</button>
							) : null}
						</div>
						<div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-theme-xs text-gray-500 dark:text-gray-400">
							{row.sku ? (
								<>
									<span>
										{__('SKU')}: {row.sku}
									</span>
									<span className="text-gray-300 dark:text-gray-700">•</span>
								</>
							) : null}
							<span className="capitalize">{store.product_types.find((type) => type.value === row.type)?.label ?? row.type}</span>
							{row.variations?.length ? (
								<>
									<span className="text-gray-300 dark:text-gray-700">•</span>
									<span>{sprintf(__('%d variations'), row.variations.length)}</span>
								</>
							) : null}
						</div>
					</div>
				</div>
			),
		},
		{
			key: 'categories',
			label: __('Categories'),
			className: 'max-w-56',
			cell: (row) => <span className="line-clamp-2 min-w-32 text-theme-sm">{row.categories?.map((category) => decodeHtml(category.name)).join(', ') || '—'}</span>,
		},
		{
			key: 'price',
			label: __('Price'),
			sortable: true,
			// `price_html` is already escaped by WooCommerce and carries the sale markup.
			cell: (row) => <span className="fd-price whitespace-nowrap font-medium text-gray-800 dark:text-white/90" dangerouslySetInnerHTML={{ __html: row.price_html || price(row.price) || '—' }} />,
		},
		{
			key: 'stock',
			label: __('Stock'),
			cell: (row) => {
				const badge = stockBadge(row, store);

				return (
					<div className="flex flex-col items-start gap-1 whitespace-nowrap">
						<Badge color={badge.color}>{badge.label}</Badge>
						{row.manage_stock && row.stock_quantity !== null ? (
							<span className="text-theme-xs text-gray-500 dark:text-gray-400">{sprintf(__('%s in stock'), Number(row.stock_quantity).toLocaleString())}</span>
						) : null}
					</div>
				);
			},
		},
		{
			key: 'status',
			label: __('Status'),
			cell: (row) => <Badge color={badges[row.status]?.color ?? 'light'}>{badges[row.status]?.label ?? row.status}</Badge>,
		},
		{
			key: 'date',
			label: __('Date'),
			sortable: true,
			cell: (row) => <span className="whitespace-nowrap">{formatDate(row.date_created)}</span>,
		},
		{
			key: 'actions',
			label: '',
			align: 'end',
			width: '56px',
			cell: (row) => (
				<DropdownMenu
					items={rowActions(row)}
					width="w-52"
					trigger={<Button variant="ghost" size="xs" icon="more_vert" iconOnly aria-label={__('Actions')} />}
				/>
			),
		},
	];

	const columns = allColumns.filter((column) => !hiddenColumns.includes(column.key));

	const columnItems: MenuItem[] = [
		{ heading: __('Visible columns') },
		...allColumns
			.filter((column) => TOGGLEABLE_COLUMNS.includes(column.key))
			.map((column) => ({
				label: column.label,
				icon: hiddenColumns.includes(column.key) ? 'check_box_outline_blank' : 'check_box',
				onSelect: () => toggleColumn(column.key),
			})),
	];

	const statusActions: MenuItem[] = ['publish', 'draft', 'pending', 'private'].map((status) => ({
		label: badges[status].label,
		onSelect: () => runBulk('status', status),
	}));

	const stockActions: MenuItem[] = (store.stock_statuses.length
		? store.stock_statuses
		: [
				{ value: 'instock', label: __('In stock') },
				{ value: 'outofstock', label: __('Out of stock') },
				{ value: 'onbackorder', label: __('On backorder') },
			]
	).map((option) => ({ label: option.label, onSelect: () => runBulk('stock_status', option.value) }));

	const moreBulkActions: MenuItem[] = [
		{ label: __('Mark as featured'), icon: 'star_full', onSelect: () => runBulk('featured', true) },
		{ label: __('Remove from featured'), icon: 'star_empty', onSelect: () => runBulk('featured', false) },
		{ separator: true },
		{ label: __('Add category'), icon: 'category', onSelect: () => setCategoryModal({ open: true, mode: 'add' }) },
		{ label: __('Remove category'), icon: 'category', onSelect: () => setCategoryModal({ open: true, mode: 'remove' }) },
	];

	const pageLinks: MenuItem[] = [
		{ label: __('Categories'), icon: 'category', onSelect: () => navigate('/categories') },
		{ label: __('Tags'), icon: 'label', onSelect: () => navigate('/tags') },
		{ label: __('Attributes'), icon: 'layers', onSelect: () => navigate('/attributes') },
		...(store.coupons_enabled !== false ? [{ label: __('Coupons'), icon: 'sell', onSelect: () => navigate('/coupons') }] : []),
		{ separator: true },
		{ label: __('Import products'), icon: 'upload', href: store.urls.product_import },
		{ label: __('Export products'), icon: 'download', href: store.urls.product_export },
		{ separator: true },
		{ label: __('Classic products screen'), icon: 'open_in_new', href: store.urls.classic_products },
	];

	const tagOptions = (tagsQuery.data?.data ?? []).map((tag) => ({ value: String(tag.id), label: decodeHtml(tag.name) }));

	const labelOf = (options: { value: string | number; label: string }[], value: string) => options.find((option) => String(option.value) === value)?.label ?? value;

	const activeFilters: ActiveFilter[] = [
		...(filters.category ? [{ key: 'category', label: sprintf(__('Category: %s'), labelOf(categoryOptions(categories), filters.category)), onRemove: () => applyFilters({ category: '' }) }] : []),
		...(filters.type ? [{ key: 'type', label: sprintf(__('Type: %s'), labelOf(store.product_types, filters.type)), onRemove: () => applyFilters({ type: '' }) }] : []),
		...(filters.stock_status
			? [{ key: 'stock', label: sprintf(__('Stock: %s'), labelOf(store.stock_statuses, filters.stock_status)), onRemove: () => applyFilters({ stock_status: '' }) }]
			: []),
		...(filters.low_stock ? [{ key: 'low', label: __('Low stock'), onRemove: () => applyFilters({ low_stock: '' }) }] : []),
		...(filters.featured ? [{ key: 'featured', label: __('Featured only'), onRemove: () => applyFilters({ featured: '' }) }] : []),
		...(filters.tag ? [{ key: 'tag', label: sprintf(__('Tag: %s'), labelOf(tagOptions, filters.tag)), onRemove: () => applyFilters({ tag: '' }) }] : []),
		...(filters.min_price ? [{ key: 'min', label: sprintf(__('From %s'), price(filters.min_price)), onRemove: () => applyFilters({ min_price: '' }) }] : []),
		...(filters.max_price ? [{ key: 'max', label: sprintf(__('Up to %s'), price(filters.max_price)), onRemove: () => applyFilters({ max_price: '' }) }] : []),
	];

	const clearFilters = () => applyFilters({ ...DEFAULT_FILTERS, search: filters.search, status: filters.status, per_page: filters.per_page });

	// A price bound is applied on blur or Enter, so typing does not fire a request per keystroke.
	const priceBound = (key: 'min_price' | 'max_price', placeholder: string) => (
		<Input
			defaultValue={filters[key]}
			key={`${key}-${filters[key]}`}
			prefix={currency.symbol}
			inputMode="decimal"
			label={placeholder}
			onBlur={(event) => applyFilters({ [key]: toDecimal(event.target.value) })}
			onKeyDown={(event) => {
				if (event.key === 'Enter') {
					applyFilters({ [key]: toDecimal(event.currentTarget.value) });
				}
			}}
		/>
	);

	return (
		<div>
			<PageHeader
				title={__('Products')}
				description={__('Manage your catalog, prices and stock.')}
				actions={
					<>
						<DropdownMenu items={pageLinks} width="w-56" trigger={<Button variant="outline" iconRight="expand_more">{__('More')}</Button>} />
						{can('edit_products') ? (
							<Button icon="add" href={store.product_editor ? '#/new' : store.urls.new_product}>
								{__('Add product')}
							</Button>
						) : null}
					</>
				}
			/>

			<StatStrip className="mb-6" items={statItems} loading={summaryQuery.isLoading} onSelect={selectStat} />

			<TableCard
				footer={
					<Pagination
						page={filters.page}
						perPage={filters.per_page}
						total={total}
						onPageChange={(page) => {
							setExpanded([]);
							setFilters({ page });
						}}
						onPerPageChange={(per_page) => applyFilters({ per_page })}
						disabled={products.isFetching}
					/>
				}
				tabs={
					<Tabs
						value={filters.status}
						onChange={(status) => {
							setSelected([]);
							applyFilters({ status });
						}}
						items={statusTabs}
						ariaLabel={__('Product status')}
					/>
				}
				search={<SearchInput value={filters.search} onChange={(search) => applyFilters({ search })} placeholder={__('Search by name or SKU')} aria-label={__('Search products')} />}
				filters={
					<>
						<Select label={__('Category')} value={filters.category} onChange={(next) => applyFilters({ category: next })} options={categoryOptions(categories)} placeholder={__('All categories')} />
						<Select label={__('Type')} value={filters.type} onChange={(next) => applyFilters({ type: next })} options={store.product_types} placeholder={__('All types')} />
						<Select
							label={__('Stock status')}
							value={filters.stock_status}
							onChange={(next) => applyFilters({ stock_status: next })}
							options={store.stock_statuses}
							placeholder={__('Any stock status')}
						/>
						<Select label={__('Tag')} value={filters.tag} onChange={(next) => applyFilters({ tag: next })} options={tagOptions} placeholder={__('All tags')} />
						<div className="grid grid-cols-2 gap-3">
							{priceBound('min_price', __('Min. price'))}
							{priceBound('max_price', __('Max. price'))}
						</div>
						<Switch checked={Boolean(filters.featured)} onCheckedChange={(featured) => applyFilters({ featured: featured ? '1' : '' })} label={__('Featured only')} />
					</>
				}
				activeFilters={activeFilters}
				onClearFilters={clearFilters}
				busy={products.isFetching && !products.isLoading}
				tools={
					<>
						<DropdownMenu items={columnItems} width="w-52" trigger={<Button variant="outline" icon="view_column" iconOnly aria-label={__('Visible columns')} />} />
						<Tooltip text={__('Refresh')}>
							<Button variant="outline" icon="refresh" iconOnly aria-label={__('Refresh')} onClick={refresh} />
						</Tooltip>
					</>
				}
			>
				<DataTable
					columns={columns}
					rows={rows}
					loading={products.isLoading}
					skeletonRows={Math.min(filters.per_page, 10)}
					caption={__('Products')}
					selectable
					selected={selected}
					onSelectedChange={setSelected}
					expandable={(product) => product.type === 'variable' && product.status !== 'trash'}
					expanded={expanded}
					onExpandedChange={setExpanded}
					renderExpanded={(product) => <ProductVariations product={product} onUpdated={() => summaryQuery.refetch()} />}
					sort={{ key: filters.orderby === 'title' ? 'name' : filters.orderby, direction: filters.order as 'asc' | 'desc' }}
					onSortChange={(next) => applyFilters({ orderby: next.key === 'name' ? 'title' : next.key, order: next.direction })}
					emptyIcon="inventory"
					emptyTitle={hasActiveFilters ? __('No products match your filters') : __('No products yet')}
					emptyDescription={hasActiveFilters ? __('Try adjusting the search or filters.') : __('Create your first product to start selling.')}
					emptyAction={
						hasActiveFilters ? (
							<Button variant="outline" size="sm" icon="close" onClick={() => applyFilters({ ...DEFAULT_FILTERS, status: filters.status, per_page: filters.per_page })}>
								{__('Clear filters')}
							</Button>
						) : can('edit_products') ? (
							<Button size="sm" icon="add" href={store.product_editor ? '#/new' : store.urls.new_product}>
								{__('Add product')}
							</Button>
						) : null
					}
					bulkActions={() =>
						isTrash ? (
							<>
								<Button size="xs" variant="outline" icon="undo" loading={bulk.isPending} onClick={() => runBulk('restore')}>
									{__('Restore')}
								</Button>
								<Button size="xs" variant="danger-outline" icon="delete" onClick={() => confirmBulk('delete')}>
									{__('Delete permanently')}
								</Button>
							</>
						) : (
							<>
								<DropdownMenu
									items={statusActions}
									align="start"
									trigger={
										<Button size="xs" variant="outline" iconRight="expand_more" loading={bulk.isPending}>
											{__('Status')}
										</Button>
									}
								/>
								<DropdownMenu
									items={stockActions}
									align="start"
									trigger={
										<Button size="xs" variant="outline" iconRight="expand_more">
											{__('Stock')}
										</Button>
									}
								/>
								<Button size="xs" variant="outline" icon="sell" onClick={() => setPriceModalOpen(true)}>
									{__('Adjust prices')}
								</Button>
								<DropdownMenu
									items={moreBulkActions}
									align="start"
									width="w-52"
									trigger={
										<Button size="xs" variant="outline" iconRight="expand_more">
											{__('More')}
										</Button>
									}
								/>
								{can('delete_products') ? (
									<Button size="xs" variant="danger-outline" icon="delete" onClick={() => confirmBulk('trash')}>
										{__('Trash')}
									</Button>
								) : null}
							</>
						)
					}
				/>
			</TableCard>

			<ProductQuickEdit
				open={quickEdit.open}
				onOpenChange={(open) => setQuickEdit((current) => ({ ...current, open }))}
				product={quickEdit.product}
				categories={categories}
				onSaved={applyUpdatedProduct}
			/>
			<BulkPriceModal open={priceModalOpen} onOpenChange={setPriceModalOpen} count={selected.length} onApply={(value) => runBulk('price', value)} />
			<BulkCategoryModal
				open={categoryModal.open}
				onOpenChange={(open) => setCategoryModal((current) => ({ ...current, open }))}
				mode={categoryModal.mode}
				options={categoryOptions(categories)}
				count={selected.length}
				onApply={(term) => runBulk(categoryModal.mode === 'add' ? 'add_category' : 'remove_category', term)}
			/>
		</div>
	);
};
