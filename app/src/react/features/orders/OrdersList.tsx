import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { useQueryFilters } from '@/react/hooks/useQueryFilters';
import { __, sprintf } from '@/react/lib/i18n';
import {
	Avatar,
	Badge,
	Button,
	Card,
	DataTable,
	DropdownMenu,
	Icon,
	PageHeader,
	Pagination,
	SearchInput,
	Select,
	StatStrip,
	Tabs,
	Tooltip,
	type Column,
	type MenuItem,
	type RowKey,
	type StatItem,
} from '@/react/ui';
import { useOrders, useOrdersBulk, useOrdersSummary } from '@/react/woo/queries';
import { useWoo } from '@/react/woo/WooProvider';
import { OrderPreview } from '@/react/features/orders/OrderPreview';
import { customerName, formatDate, itemsCount, relativeDate, shippingSummary, totalRefunded } from '@/react/features/orders/orderFormat';
import { useOrderHelpers } from '@/react/features/orders/useOrderHelpers';
import type { Order } from '@/react/woo/types';

/**
 * Orders screen: counters, revenue for the chosen period, filters, quick preview and bulk actions.
 */

const DEFAULT_FILTERS = {
	status: 'any',
	search: '',
	date: '',
	payment_method: '',
	created_via: '',
	origin: '',
	customer: '',
	customer_name: '',
	period: '30',
	page: 1,
	per_page: 20,
	orderby: 'date',
	order: 'desc',
};

const RELATIVE_PERIODS: Record<string, number> = { 7: 7, 30: 30, 90: 90 };

/** Translate the date filter into the `after` parameter `wc/v3` understands. */
const dateRange = (value: string): Record<string, string> => {
	if (!value) {
		return {};
	}

	const start = new Date();
	start.setHours(0, 0, 0, 0);

	if (value === 'month') {
		start.setDate(1);
	} else if (value === 'year') {
		start.setMonth(0, 1);
	} else if (RELATIVE_PERIODS[value]) {
		start.setDate(start.getDate() - (RELATIVE_PERIODS[value] - 1));
	}

	return { after: start.toISOString() };
};

const POLL_INTERVAL = 60_000;

export const OrdersList = () => {
	const navigate = useNavigate();
	const confirm = useConfirm();
	const { notify } = useNotify();
	const { store, can, price } = useWoo();
	const { price: orderPrice, classicUrl, statusActions, orderStatus } = useOrderHelpers();

	const { filters, setFilters } = useQueryFilters(DEFAULT_FILTERS);
	const [selected, setSelected] = useState<RowKey[]>([]);
	const [preview, setPreview] = useState<{ open: boolean; order: Order | null }>({ open: false, order: null });
	const [showMoreFilters, setShowMoreFilters] = useState(Boolean(filters.payment_method || filters.created_via || filters.origin));
	const [seenTotal, setSeenTotal] = useState<number | null>(null);

	const periodDays = Number(filters.period) || 30;

	const summaryParams = useMemo(() => {
		const to = new Date();
		const from = new Date();
		from.setDate(from.getDate() - (periodDays - 1));
		const iso = (date: Date) => date.toISOString().slice(0, 10);

		return { date_from: iso(from), date_to: iso(to) };
	}, [periodDays]);

	const listParams = useMemo(
		() => ({
			page: filters.page,
			per_page: filters.per_page,
			status: filters.status,
			orderby: filters.orderby,
			order: filters.order,
			search: filters.search,
			customer: filters.customer,
			fd_payment_method: filters.payment_method,
			fd_created_via: filters.created_via,
			fd_origin: filters.origin,
			...dateRange(filters.date),
		}),
		[filters]
	);

	const orders = useOrders(listParams);
	// The counters double as the "new orders" poll, so they refresh on their own.
	const summaryQuery = useOrdersSummary(summaryParams, { refetchInterval: POLL_INTERVAL });
	const bulk = useOrdersBulk();

	const rows = orders.data?.data ?? [];
	const total = orders.data?.totalItems ?? 0;
	const summary = summaryQuery.data;
	const isTrash = filters.status === 'trash';

	const hasActiveFilters = Boolean(filters.search || filters.date || filters.payment_method || filters.created_via || filters.origin || filters.customer);

	// The first loaded total becomes the baseline; anything above it arrived while the user was here.
	const knownTotal = summary?.total;

	if (knownTotal !== undefined && seenTotal === null) {
		setSeenTotal(knownTotal);
	}

	const newOrders = knownTotal !== undefined && seenTotal !== null && knownTotal > seenTotal ? knownTotal - seenTotal : 0;

	const applyFilters = (patch: Partial<typeof DEFAULT_FILTERS>) => {
		setSelected([]);
		setFilters({ ...patch, page: 1 });
	};

	const refresh = () => {
		setSelected([]);
		orders.refetch();
		summaryQuery.refetch();
	};

	const showNewOrders = () => {
		setSeenTotal(knownTotal ?? null);
		applyFilters({ status: 'any' });
		refresh();
	};

	const statusTabs = useMemo(() => {
		const counts = summary?.counts ?? {};
		const tabs: { value: string; label: string; count?: number }[] = [{ value: 'any', label: __('All'), count: summary?.total }];

		store.order_statuses
			.filter((status) => status.value !== 'checkout-draft')
			.forEach((status) => {
				const count = counts[status.value];

				if ((count ?? 0) > 0 || ['processing', 'on-hold', 'completed'].includes(status.value) || filters.status === status.value) {
					tabs.push({ value: status.value, label: status.label, count });
				}
			});

		if ((counts.trash ?? 0) > 0 || filters.status === 'trash') {
			tabs.push({ value: 'trash', label: __('Trash'), count: counts.trash });
		}

		return tabs;
	}, [filters.status, store.order_statuses, summary]);

	const statItems: StatItem[] = [
		{
			key: 'pending',
			label: orderStatus('pending').label || __('Pending payment'),
			value: (summary?.counts?.pending ?? 0).toLocaleString(),
			tone: summary?.counts?.pending ? 'warning' : 'default',
			clickable: true,
			active: filters.status === 'pending',
		},
		{
			key: 'processing',
			label: orderStatus('processing').label || __('Processing'),
			value: (summary?.counts?.processing ?? 0).toLocaleString(),
			tone: 'brand',
			clickable: true,
			active: filters.status === 'processing',
		},
		{
			key: 'on-hold',
			label: orderStatus('on-hold').label || __('On hold'),
			value: (summary?.counts?.['on-hold'] ?? 0).toLocaleString(),
			clickable: true,
			active: filters.status === 'on-hold',
		},
		{
			key: 'revenue',
			label: sprintf(__('Net revenue (%s days)'), filters.period),
			value: price(summary?.period?.net_revenue ?? 0),
			hint: sprintf(__('%s orders'), (summary?.period?.orders_count ?? 0).toLocaleString()),
			tone: 'success',
		},
	];

	const selectStat = (item: StatItem) => {
		if (item.key === 'revenue') {
			return;
		}

		applyFilters({ status: filters.status === item.key ? 'any' : item.key });
	};

	const openDetails = (order: Order) => navigate(`/order/${order.id}`);

	const runBulk = async (action: string, value?: unknown, ids: number[] = selected.map(Number)) => {
		if (!ids.length) {
			return;
		}

		const result = await bulk.mutateAsync({ ids, action, value });
		const { updated = [], failed = [] } = result ?? {};

		if (updated.length) {
			notify({ title: sprintf(__('%d order(s) updated'), updated.length), tone: 'success' });
		}

		if (failed.length) {
			notify({ title: sprintf(__('%d order(s) could not be updated'), failed.length), message: failed[0]?.message || '', tone: 'error' });
		}

		refresh();
	};

	const confirmDelete = async (action: 'trash' | 'delete', ids: number[] = selected.map(Number)) => {
		const permanent = action === 'delete';

		const confirmed = await confirm({
			title: permanent ? __('Delete permanently?') : __('Move to trash?'),
			message: permanent
				? sprintf(__('%d order(s) will be permanently deleted. This action cannot be undone.'), ids.length)
				: sprintf(__('%d order(s) will be moved to the trash.'), ids.length),
			confirmLabel: permanent ? __('Delete permanently') : __('Move to trash'),
			variant: 'danger',
		});

		if (confirmed) {
			runBulk(action, undefined, ids);
		}
	};

	const filterByCustomer = (order: Order) => {
		if (!order.customer_id) {
			return;
		}

		applyFilters({ customer: String(order.customer_id), customer_name: customerName(order) });
	};

	const rowActions = (order: Order): MenuItem[] => {
		if (order.status === 'trash') {
			return [
				{ label: __('Restore'), icon: 'undo', onSelect: () => runBulk('restore', undefined, [order.id]) },
				{ separator: true },
				{ label: __('Delete permanently'), icon: 'delete', danger: true, onSelect: () => confirmDelete('delete', [order.id]) },
			];
		}

		return [
			{ label: __('View details'), icon: 'receipt_long', onSelect: () => openDetails(order) },
			...(order.customer_id ? [{ label: __('Orders from this customer'), icon: 'person', onSelect: () => filterByCustomer(order) }] : []),
			{ label: __('Quick preview'), icon: 'visibility', onSelect: () => setPreview({ open: true, order }) },
			{ heading: __('Change status') },
			...statusActions((status) => runBulk('status', status, [order.id]), order.status),
			{ separator: true },
			{ label: __('Open in classic editor'), icon: 'open_in_new', href: classicUrl(order.id) },
			...(can('delete_shop_orders') ? [{ label: __('Move to trash'), icon: 'delete', danger: true, onSelect: () => confirmDelete('trash', [order.id]) }] : []),
		];
	};

	/** Export what is on screen, or just the selected rows. */
	const exportCsv = () => {
		const exported = rows.filter((order) => !selected.length || selected.includes(order.id));
		const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
		const header = [__('Order'), __('Date'), __('Status'), __('Customer'), __('Email'), __('Phone'), __('Items'), __('Total'), __('Payment'), __('City'), __('State')];

		const lines = exported.map((order) =>
			[
				order.number,
				order.date_created,
				orderStatus(order.status).label,
				customerName(order),
				order.billing?.email,
				order.billing?.phone,
				itemsCount(order),
				order.total,
				order.payment_method_title,
				order.shipping?.city || order.billing?.city,
				order.shipping?.state || order.billing?.state,
			]
				.map(escape)
				.join(',')
		);

		// The BOM keeps accents readable when the file is opened in a spreadsheet.
		const blob = new Blob([`﻿${[header.map(escape).join(','), ...lines].join('\n')}`], { type: 'text/csv;charset=utf-8' });
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
		link.click();
		URL.revokeObjectURL(link.href);
	};

	const columns: Column<Order>[] = [
		{
			key: 'order',
			label: __('Order'),
			sortable: true,
			cell: (row) => (
				<div className="whitespace-nowrap">
					<a
						href={`#/order/${row.id}`}
						className="font-medium text-gray-800 hover:text-brand-500 dark:text-white/90 dark:hover:text-brand-400"
						onClick={(event) => {
							event.preventDefault();
							openDetails(row);
						}}
					>
						#{row.number}
					</a>
					<p className="text-theme-xs text-gray-500 dark:text-gray-400">{row.created_via === 'admin' ? __('Created in admin') : __('Online store')}</p>
				</div>
			),
		},
		{
			key: 'customer',
			label: __('Customer'),
			cell: (row) => (
				<div className="flex min-w-48 items-center gap-3">
					<Avatar name={customerName(row)} size="sm" />
					<div className="min-w-0">
						<p className="truncate font-medium text-gray-800 dark:text-white/90">{customerName(row)}</p>
						<p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">{row.billing?.email || '—'}</p>
					</div>
				</div>
			),
		},
		{
			key: 'status',
			label: __('Status'),
			cell: (row) => <Badge color={orderStatus(row.status).color as never}>{orderStatus(row.status).label}</Badge>,
		},
		{
			key: 'items',
			label: __('Items'),
			align: 'center',
			cell: (row) => <span className="font-medium text-gray-800 dark:text-white/90">{itemsCount(row)}</span>,
		},
		{
			key: 'total',
			label: __('Total'),
			align: 'end',
			cell: (row) => (
				<div className="whitespace-nowrap text-end">
					<p className="font-medium text-gray-800 dark:text-white/90">{orderPrice(row.total, row)}</p>
					{totalRefunded(row) ? <p className="text-theme-xs text-error-500">{sprintf(__('%s refunded'), orderPrice(totalRefunded(row), row))}</p> : null}
				</div>
			),
		},
		{ key: 'payment', label: __('Payment'), cell: (row) => <span className="whitespace-nowrap">{row.payment_method_title || '—'}</span> },
		{
			key: 'shipping',
			label: __('Shipping'),
			cell: (row) => {
				const shipping = shippingSummary(row);

				return (
					<div className="min-w-32">
						<p className="truncate text-gray-700 dark:text-gray-300">{shipping.location || '—'}</p>
						{shipping.method ? <p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">{shipping.method}</p> : null}
					</div>
				);
			},
		},
		{
			key: 'date',
			label: __('Date'),
			sortable: true,
			cell: (row) => (
				<Tooltip text={formatDate(row.date_created, true)}>
					<span className="whitespace-nowrap">{relativeDate(row.date_created)}</span>
				</Tooltip>
			),
		},
		{
			key: 'actions',
			label: '',
			align: 'end',
			width: '56px',
			cell: (row) => (
				<div className="flex items-center justify-end gap-1" data-no-row-click>
					{row.status !== 'trash' ? (
						<Tooltip text={__('Quick preview')}>
							<Button variant="ghost" size="xs" icon="visibility" iconOnly aria-label={__('Quick preview')} onClick={() => setPreview({ open: true, order: row })} />
						</Tooltip>
					) : null}
					<DropdownMenu items={rowActions(row)} width="w-56" trigger={<Button variant="ghost" size="xs" icon="more_vert" iconOnly aria-label={__('Actions')} />} />
				</div>
			),
		},
	];

	const pageLinks: MenuItem[] = [
		{ label: __('Export current page (CSV)'), icon: 'download', onSelect: exportCsv },
		{ separator: true },
		{ label: __('Add order in classic screen'), icon: 'open_in_new', href: store.urls.new_order },
		{ label: __('Customers'), icon: 'person', href: `${store.urls.users}?role=customer` },
		{ label: __('WooCommerce settings'), icon: 'settings', href: store.urls.settings },
		{ label: __('Classic orders screen'), icon: 'open_in_new', href: store.urls.classic_orders },
	];

	const paymentOptions = store.payment_gateways.map((gateway) => ({ value: gateway.value, label: gateway.label }));

	const dateOptions = [
		{ value: 'today', label: __('Today') },
		{ value: '7', label: __('Last 7 days') },
		{ value: '30', label: __('Last 30 days') },
		{ value: 'month', label: __('This month') },
		{ value: '90', label: __('Last 90 days') },
		{ value: 'year', label: __('This year') },
	];

	const createdViaOptions = [
		{ value: 'checkout', label: __('Classic checkout') },
		{ value: 'store-api', label: __('Block checkout') },
		{ value: 'admin', label: __('Created in admin') },
		{ value: 'rest-api', label: __('REST API') },
	];

	const originOptions = [
		{ value: 'organic', label: __('Organic') },
		{ value: 'referral', label: __('Referral') },
		{ value: 'utm', label: __('Campaign') },
		{ value: 'typein', label: __('Direct') },
		{ value: 'admin', label: __('Web admin') },
		{ value: 'mobile_app', label: __('Mobile app') },
		{ value: 'pos', label: __('Point of sale') },
	];

	return (
		<div>
			<PageHeader
				title={__('Orders')}
				description={__('Track, fulfil and manage your store orders.')}
				actions={
					<>
						<Tabs
							value={filters.period}
							onChange={(period) => setFilters({ period })}
							variant="segmented"
							ariaLabel={__('Revenue period')}
							items={[
								{ value: '7', label: __('7 days') },
								{ value: '30', label: __('30 days') },
								{ value: '90', label: __('90 days') },
							]}
						/>
						<DropdownMenu
							items={pageLinks}
							width="w-60"
							trigger={
								<Button variant="outline" iconRight="expand_more">
									{__('More')}
								</Button>
							}
						/>
						{can('edit_shop_orders') ? (
							<Button icon="add" onClick={() => navigate('/new')}>
								{__('Add order')}
							</Button>
						) : null}
					</>
				}
			/>

			<StatStrip className="mb-6" items={statItems} loading={summaryQuery.isLoading} onSelect={selectStat} />

			<Card
				padding="none"
				footer={
					<Pagination
						page={filters.page}
						perPage={filters.per_page}
						total={total}
						onPageChange={(page) => setFilters({ page })}
						onPerPageChange={(per_page) => applyFilters({ per_page })}
						disabled={orders.isFetching}
					/>
				}
			>
				<div className="px-5 pt-2 sm:px-6">
					<Tabs value={filters.status} onChange={(status) => applyFilters({ status })} items={statusTabs} ariaLabel={__('Order status')} />
				</div>

				<div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:flex-wrap sm:items-center sm:px-6">
					<SearchInput value={filters.search} onChange={(search) => applyFilters({ search })} className="w-full sm:w-80" placeholder={__('Search order, customer or email')} />
					<div className="flex flex-wrap items-center gap-2 sm:contents">
						<Select
							value={filters.date}
							onChange={(next) => applyFilters({ date: next })}
							options={dateOptions}
							placeholder={__('Any date')}
							className="min-w-0 flex-1 sm:w-48 sm:flex-none"
							aria-label={__('Date')}
						/>
						<Button variant="outline" icon="filter_alt" aria-expanded={showMoreFilters} onClick={() => setShowMoreFilters((current) => !current)}>
							{__('Filters')}
						</Button>
						<div className="flex items-center gap-2 sm:ms-auto">
							{hasActiveFilters ? (
								<Button
									variant="ghost"
									icon="close"
									onClick={() => applyFilters({ ...DEFAULT_FILTERS, status: filters.status, period: filters.period, per_page: filters.per_page })}
								>
									{__('Clear filters')}
								</Button>
							) : null}
							<Tooltip text={__('Refresh')}>
								<Button variant="outline" icon="refresh" iconOnly aria-label={__('Refresh')} onClick={refresh} />
							</Tooltip>
						</div>
					</div>
				</div>

				{showMoreFilters || filters.customer ? (
					<div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:flex-wrap sm:items-center sm:px-6">
						{showMoreFilters ? (
							<>
								{paymentOptions.length ? (
									<Select
										value={filters.payment_method}
										onChange={(next) => applyFilters({ payment_method: next })}
										options={paymentOptions}
										placeholder={__('Any payment method')}
										className="sm:w-52"
										aria-label={__('Payment method')}
									/>
								) : null}
								<Select
									value={filters.created_via}
									onChange={(next) => applyFilters({ created_via: next })}
									options={createdViaOptions}
									placeholder={__('Any channel')}
									className="sm:w-48"
									aria-label={__('Channel')}
								/>
								<Select
									value={filters.origin}
									onChange={(next) => applyFilters({ origin: next })}
									options={originOptions}
									placeholder={__('Any origin')}
									className="sm:w-44"
									aria-label={__('Origin')}
								/>
							</>
						) : null}
						{filters.customer ? (
							<span className="inline-flex items-center gap-1.5 self-start rounded-full bg-brand-50 py-1 ps-3 pe-1.5 text-theme-sm text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 sm:self-auto">
								{sprintf(__('Customer: %s'), filters.customer_name || `#${filters.customer}`)}
								<button
									type="button"
									className="rounded-full p-0.5 hover:bg-brand-100 dark:hover:bg-brand-500/20"
									aria-label={__('Remove customer filter')}
									onClick={() => applyFilters({ customer: '', customer_name: '' })}
								>
									<Icon name="close" className="text-theme-sm" />
								</button>
							</span>
						) : null}
					</div>
				) : null}

				{newOrders ? (
					<div
						className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-100 bg-brand-50 px-5 py-3 text-theme-sm text-brand-700 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300 sm:px-6"
						role="status"
					>
						<span className="flex items-center gap-2">
							<Icon name="notifications" className="text-theme-lg" />
							{sprintf(__('%d new order(s) received'), newOrders)}
						</span>
						<Button size="xs" onClick={showNewOrders}>
							{__('Show new orders')}
						</Button>
					</div>
				) : null}

				<DataTable
					columns={columns}
					rows={rows}
					loading={orders.isLoading}
					skeletonRows={Math.min(filters.per_page, 10)}
					caption={__('Orders')}
					selectable
					selected={selected}
					onSelectedChange={setSelected}
					clickableRows
					onRowClick={openDetails}
					sort={{ key: filters.orderby === 'id' ? 'order' : filters.orderby, direction: filters.order as 'asc' | 'desc' }}
					onSortChange={(next) => applyFilters({ orderby: next.key === 'order' ? 'id' : next.key, order: next.direction })}
					emptyIcon="shopping_bag"
					emptyTitle={hasActiveFilters ? __('No orders match your filters') : __('No orders yet')}
					emptyDescription={hasActiveFilters ? __('Try adjusting the search or date range.') : __('New orders will appear here as soon as customers check out.')}
					bulkActions={() =>
						isTrash ? (
							<>
								<Button size="xs" variant="outline" icon="undo" loading={bulk.isPending} onClick={() => runBulk('restore')}>
									{__('Restore')}
								</Button>
								<Button size="xs" variant="danger-outline" icon="delete" onClick={() => confirmDelete('delete')}>
									{__('Delete permanently')}
								</Button>
							</>
						) : (
							<>
								<DropdownMenu
									items={statusActions((status) => runBulk('status', status))}
									align="start"
									width="w-52"
									trigger={
										<Button size="xs" variant="outline" iconRight="expand_more" loading={bulk.isPending}>
											{__('Change status')}
										</Button>
									}
								/>
								<Button size="xs" variant="outline" icon="download" onClick={exportCsv}>
									{__('Export CSV')}
								</Button>
								{can('delete_shop_orders') ? (
									<Button size="xs" variant="danger-outline" icon="delete" onClick={() => confirmDelete('trash')}>
										{__('Trash')}
									</Button>
								) : null}
							</>
						)
					}
				/>
			</Card>

			<OrderPreview
				open={preview.open}
				onOpenChange={(open) => setPreview((current) => ({ ...current, open }))}
				order={preview.order}
				onStatusChanged={refresh}
				onOpenDetails={openDetails}
			/>
		</div>
	);
};
