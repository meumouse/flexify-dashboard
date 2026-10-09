import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { __, sprintf } from '@/react/lib/i18n';
import { Badge, Button, Card, Checkbox, DataTable, DatePicker, DropdownMenu, Input, PageHeader, Pagination, SearchInput, Select, Sheet, Textarea, Tooltip, type Column } from '@/react/ui';
import { useCoupons, useWooMutation, wooKeys } from '@/react/woo/queries';
import { useWoo } from '@/react/woo/WooProvider';
import type { BadgeColor } from '@/react/ui/recipes';
import type { Coupon, CouponType } from '@/react/woo/types';

/**
 * Discount codes: list, editor with a code generator, restrictions and usage limits.
 */

type Form = {
	id: number | null;
	code: string;
	discount_type: CouponType;
	amount: string;
	description: string;
	date_expires: string;
	free_shipping: boolean;
	individual_use: boolean;
	exclude_sale_items: boolean;
	minimum_amount: string;
	maximum_amount: string;
	usage_limit: string;
	usage_limit_per_user: string;
	email_restrictions: string;
};

const emptyForm = (): Form => ({
	id: null,
	code: '',
	discount_type: 'percent',
	amount: '',
	description: '',
	date_expires: '',
	free_shipping: false,
	individual_use: false,
	exclude_sale_items: false,
	minimum_amount: '',
	maximum_amount: '',
	usage_limit: '',
	usage_limit_per_user: '',
	email_restrictions: '',
});

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const CouponsView = () => {
	const navigate = useNavigate();
	const confirm = useConfirm();
	const { notify } = useNotify();
	const { wc, price, currency, toDecimal, store } = useWoo();

	const [search, setSearch] = useState('');
	const [page, setPage] = useState(1);
	const [perPage, setPerPage] = useState(20);
	const [editorOpen, setEditorOpen] = useState(false);
	const [form, setForm] = useState<Form>(emptyForm);
	const [errors, setErrors] = useState<Partial<Record<'code' | 'amount', string>>>({});

	const query = useCoupons({ page, per_page: perPage, search, orderby: 'date', order: 'desc' });
	const rows = query.data?.data ?? [];
	const total = query.data?.totalItems ?? 0;

	const saveCouponMutation = useWooMutation<Coupon, { id: number | null; data: Record<string, unknown> }>(
		async ({ id, data }) => (await wc<Coupon>(id ? `coupons/${id}` : 'coupons', { method: id ? 'PUT' : 'POST', data })).data as unknown as Coupon,
		[wooKeys.couponsRoot]
	);

	const trashCoupon = useWooMutation<Coupon, number>(async (id) => (await wc<Coupon>(`coupons/${id}`, { method: 'DELETE' })).data as unknown as Coupon, [wooKeys.couponsRoot]);

	const typeOptions = [
		{ value: 'percent', label: __('Percentage discount') },
		{ value: 'fixed_cart', label: __('Fixed cart discount') },
		{ value: 'fixed_product', label: __('Fixed product discount') },
	];

	const localPrice = (value: string | number | null | undefined) =>
		value === '' || value === null || value === undefined ? '' : String(value).replace('.', currency.decimal_separator || ',');

	const isExpired = (coupon: Coupon) => Boolean(coupon.date_expires && new Date(coupon.date_expires) < new Date());

	const couponState = (coupon: Coupon): { color: BadgeColor; label: string } => {
		if (coupon.status !== 'publish') {
			return { color: 'light', label: __('Draft') };
		}

		if (isExpired(coupon)) {
			return { color: 'error', label: __('Expired') };
		}

		if (coupon.usage_limit && (coupon.usage_count ?? 0) >= coupon.usage_limit) {
			return { color: 'warning', label: __('Used up') };
		}

		return { color: 'success', label: __('Active') };
	};

	const discountLabel = (coupon: Coupon) => (coupon.discount_type === 'percent' ? `${Number(coupon.amount).toLocaleString()}%` : price(coupon.amount));

	const formatDate = (value?: string | null) => (value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—');

	const openEditor = (coupon: Coupon | null = null) => {
		setErrors({});
		setForm(
			coupon
				? {
						id: coupon.id,
						code: coupon.code,
						discount_type: coupon.discount_type,
						amount: localPrice(coupon.amount),
						description: coupon.description || '',
						date_expires: coupon.date_expires ? String(coupon.date_expires).slice(0, 10) : '',
						free_shipping: Boolean(coupon.free_shipping),
						individual_use: Boolean(coupon.individual_use),
						exclude_sale_items: Boolean(coupon.exclude_sale_items),
						minimum_amount: localPrice(Number(coupon.minimum_amount) ? coupon.minimum_amount : ''),
						maximum_amount: localPrice(Number(coupon.maximum_amount) ? coupon.maximum_amount : ''),
						usage_limit: coupon.usage_limit === null || coupon.usage_limit === undefined ? '' : String(coupon.usage_limit),
						usage_limit_per_user: coupon.usage_limit_per_user === null || coupon.usage_limit_per_user === undefined ? '' : String(coupon.usage_limit_per_user),
						email_restrictions: (coupon.email_restrictions ?? []).join(', '),
					}
				: emptyForm()
		);
		setEditorOpen(true);
	};

	const generateCode = () => {
		const values = crypto.getRandomValues(new Uint32Array(8));

		setForm((current) => ({ ...current, code: Array.from(values, (value) => CODE_CHARS[value % CODE_CHARS.length]).join('') }));
	};

	const saveCoupon = async () => {
		const next: typeof errors = {};

		if (!form.code.trim()) {
			next.code = __('The coupon code is required.');
		}

		if (form.discount_type === 'percent' && Number(toDecimal(form.amount)) > 100) {
			next.amount = __('A percentage discount cannot be higher than 100.');
		}

		setErrors(next);

		if (Object.keys(next).length) {
			return;
		}

		await saveCouponMutation.mutateAsync({
			id: form.id,
			data: {
				code: form.code.trim(),
				discount_type: form.discount_type,
				amount: toDecimal(form.amount) || '0',
				description: form.description,
				date_expires: form.date_expires ? `${form.date_expires}T23:59:59` : null,
				free_shipping: form.free_shipping,
				individual_use: form.individual_use,
				exclude_sale_items: form.exclude_sale_items,
				minimum_amount: toDecimal(form.minimum_amount),
				maximum_amount: toDecimal(form.maximum_amount),
				usage_limit: form.usage_limit === '' ? null : Number(form.usage_limit),
				usage_limit_per_user: form.usage_limit_per_user === '' ? null : Number(form.usage_limit_per_user),
				email_restrictions: form.email_restrictions
					.split(',')
					.map((email) => email.trim())
					.filter(Boolean),
			},
		});

		notify({ title: form.id ? __('Coupon updated') : __('Coupon created'), tone: 'success' });
		setEditorOpen(false);
		query.refetch();
	};

	const copyCode = async (coupon: Coupon) => {
		try {
			await navigator.clipboard.writeText(coupon.code);
			notify({ title: __('Coupon code copied'), tone: 'success' });
		} catch {
			notify({ title: __('Could not copy the code'), tone: 'error' });
		}
	};

	const removeCoupon = async (coupon: Coupon) => {
		const confirmed = await confirm({
			title: __('Move coupon to trash?'),
			message: coupon.code,
			confirmLabel: __('Move to trash'),
			variant: 'danger',
		});

		if (!confirmed) {
			return;
		}

		await trashCoupon.mutateAsync(coupon.id);
		notify({ title: __('Coupon moved to the trash'), tone: 'success' });
		query.refetch();
	};

	const columns: Column<Coupon>[] = [
		{
			key: 'code',
			label: __('Code'),
			cell: (row) => (
				<div className="min-w-40">
					<span className="rounded-lg border border-dashed border-gray-300 px-2 py-0.5 font-mono text-theme-sm font-medium uppercase text-gray-800 dark:border-gray-700 dark:text-white/90">
						{row.code}
					</span>
					{row.description ? <p className="mt-1 truncate text-theme-xs text-gray-500 dark:text-gray-400">{row.description}</p> : null}
				</div>
			),
		},
		{
			key: 'amount',
			label: __('Discount'),
			cell: (row) => (
				<div className="whitespace-nowrap">
					<p className="font-medium text-gray-800 dark:text-white/90">{discountLabel(row)}</p>
					<p className="text-theme-xs text-gray-500 dark:text-gray-400">
						{typeOptions.find((option) => option.value === row.discount_type)?.label ?? row.discount_type}
						{row.free_shipping ? ` · ${__('Free shipping')}` : null}
					</p>
				</div>
			),
		},
		{
			key: 'usage',
			label: __('Usage'),
			cell: (row) => <span className="whitespace-nowrap">{row.usage_limit ? `${row.usage_count ?? 0} / ${row.usage_limit}` : sprintf(__('%d used'), row.usage_count || 0)}</span>,
		},
		{
			key: 'expires',
			label: __('Expires'),
			cell: (row) => <span className={`whitespace-nowrap ${isExpired(row) ? 'text-error-500' : ''}`}>{formatDate(row.date_expires)}</span>,
		},
		{
			key: 'status',
			label: __('Status'),
			cell: (row) => {
				const state = couponState(row);

				return <Badge color={state.color}>{state.label}</Badge>;
			},
		},
		{
			key: 'actions',
			label: '',
			align: 'end',
			width: '56px',
			cell: (row) => (
				<DropdownMenu
					items={[
						{ label: __('Edit'), icon: 'edit', onSelect: () => openEditor(row) },
						{ label: __('Copy code'), icon: 'content_copy', onSelect: () => copyCode(row) },
						{ separator: true },
						{ label: __('Move to trash'), icon: 'delete', danger: true, onSelect: () => removeCoupon(row) },
					]}
					trigger={<Button variant="ghost" size="xs" icon="more_vert" iconOnly aria-label={__('Actions')} />}
				/>
			),
		},
	];

	const set = (patch: Partial<Form>) => setForm((current) => ({ ...current, ...patch }));

	return (
		<div>
			<PageHeader
				title={__('Coupons')}
				description={__('Create discount codes for your customers.')}
				breadcrumbs={[{ label: __('Products'), onClick: () => navigate('/') }, { label: __('Coupons') }]}
				actions={
					<>
						<Button variant="outline" icon="open_in_new" href={store.urls.coupons}>
							{__('Classic screen')}
						</Button>
						<Button icon="add" onClick={() => openEditor()}>
							{__('Add coupon')}
						</Button>
					</>
				}
			/>

			<Card
				padding="none"
				footer={
					<Pagination
						page={page}
						perPage={perPage}
						total={total}
						onPageChange={setPage}
						onPerPageChange={(value) => {
							setPerPage(value);
							setPage(1);
						}}
						disabled={query.isFetching}
					/>
				}
			>
				<div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
					<SearchInput
						value={search}
						onChange={(value) => {
							setSearch(value);
							setPage(1);
						}}
						className="w-full sm:w-80"
						placeholder={__('Search coupons')}
					/>
				</div>

				<DataTable
					columns={columns}
					rows={rows}
					loading={query.isLoading}
					skeletonRows={5}
					clickableRows
					onRowClick={openEditor}
					emptyIcon="sell"
					emptyTitle={search ? __('No coupons match your search') : __('No coupons yet')}
					emptyDescription={__('Coupons give customers a discount at checkout.')}
					caption={__('Coupons')}
				/>
			</Card>

			<Sheet
				open={editorOpen}
				onOpenChange={setEditorOpen}
				size="lg"
				title={form.id ? __('Edit coupon') : __('Add coupon')}
				footer={
					<>
						<Button variant="outline" onClick={() => setEditorOpen(false)}>
							{__('Cancel')}
						</Button>
						<Button type="submit" form="fd-coupon-form" loading={saveCouponMutation.isPending}>
							{__('Save coupon')}
						</Button>
					</>
				}
			>
				<form
					id="fd-coupon-form"
					className="space-y-6"
					onSubmit={(event) => {
						event.preventDefault();
						saveCoupon();
					}}
				>
					<section className="space-y-4">
						<div className="flex items-end gap-2">
							<Input value={form.code} onChange={(event) => set({ code: event.target.value })} className="flex-1" label={__('Coupon code')} error={errors.code} required />
							<Tooltip text={__('Generate code')}>
								<Button variant="outline" icon="sparkles" iconOnly aria-label={__('Generate code')} onClick={generateCode} />
							</Tooltip>
						</div>
						<Textarea value={form.description} onChange={(event) => set({ description: event.target.value })} rows={2} label={__('Description (optional)')} />
					</section>

					<section className="space-y-4">
						<h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">{__('Discount')}</h3>
						<div className="grid gap-4 sm:grid-cols-2">
							<Select value={form.discount_type} onChange={(next) => set({ discount_type: next as CouponType })} options={typeOptions} label={__('Discount type')} />
							<Input
								value={form.amount}
								onChange={(event) => set({ amount: event.target.value })}
								label={__('Amount')}
								prefix={form.discount_type === 'percent' ? undefined : currency.symbol}
								suffix={form.discount_type === 'percent' ? '%' : undefined}
								inputMode="decimal"
								error={errors.amount}
							/>
							<DatePicker value={form.date_expires} onChange={(date_expires) => set({ date_expires })} label={__('Expiry date')} placeholder={__('Never expires')} />
						</div>
						<Checkbox
							checked={form.free_shipping}
							onCheckedChange={(free_shipping) => set({ free_shipping })}
							label={__('Allow free shipping')}
							description={__('Requires a free shipping method that accepts coupons.')}
						/>
					</section>

					<section className="space-y-4">
						<h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">{__('Usage restrictions')}</h3>
						<div className="grid gap-4 sm:grid-cols-2">
							<Input value={form.minimum_amount} onChange={(event) => set({ minimum_amount: event.target.value })} label={__('Minimum spend')} prefix={currency.symbol} inputMode="decimal" />
							<Input value={form.maximum_amount} onChange={(event) => set({ maximum_amount: event.target.value })} label={__('Maximum spend')} prefix={currency.symbol} inputMode="decimal" />
						</div>
						<Input
							value={form.email_restrictions}
							onChange={(event) => set({ email_restrictions: event.target.value })}
							label={__('Allowed emails')}
							hint={__('Separate emails with commas. Use * as a wildcard, e.g. *@example.com.')}
						/>
						<Checkbox
							checked={form.individual_use}
							onCheckedChange={(individual_use) => set({ individual_use })}
							label={__('Individual use only')}
							description={__('The coupon cannot be combined with other coupons.')}
						/>
						<Checkbox checked={form.exclude_sale_items} onCheckedChange={(exclude_sale_items) => set({ exclude_sale_items })} label={__('Exclude sale items')} />
					</section>

					<section className="space-y-4">
						<h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">{__('Usage limits')}</h3>
						<div className="grid gap-4 sm:grid-cols-2">
							<Input
								value={form.usage_limit}
								onChange={(event) => set({ usage_limit: event.target.value })}
								type="number"
								min={0}
								step={1}
								label={__('Usage limit per coupon')}
								placeholder={__('Unlimited')}
							/>
							<Input
								value={form.usage_limit_per_user}
								onChange={(event) => set({ usage_limit_per_user: event.target.value })}
								type="number"
								min={0}
								step={1}
								label={__('Usage limit per user')}
								placeholder={__('Unlimited')}
							/>
						</div>
					</section>
				</form>
			</Sheet>
		</div>
	);
};
