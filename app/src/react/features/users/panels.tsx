import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRest, useWpData } from '@/react/app/WpDataProvider';
import { useUnsavedChanges } from '@/react/hooks/useUnsavedChanges';
import { cn } from '@/react/lib/cn';
import { decodeHtml, stripTags } from '@/react/lib/html';
import { __ } from '@/react/lib/i18n';
import { Badge, Button, Card, Checkbox, Icon, Input, Skeleton, Textarea } from '@/react/ui';
import { useRoles, useUserMutations, type User } from '@/react/features/users/queries';

/**
 * What a user's page is made of. Each panel is its own thing so a plugin can add one beside
 * them, which is what the Vue screen's component registry was for.
 */

export type PanelProps = { user: User };

export const DetailsPanel = ({ user }: PanelProps) => {
	const { save } = useUserMutations();
	const rolesQuery = useRoles();
	const [form, setForm] = useState({
		name: user.name,
		email: user.email,
		url: user.url,
		description: user.description,
		first_name: String(user.meta?.first_name ?? ''),
		last_name: String(user.meta?.last_name ?? ''),
		roles: user.roles,
	});

	useEffect(() => {
		setForm({
			name: user.name,
			email: user.email,
			url: user.url,
			description: user.description,
			first_name: String(user.meta?.first_name ?? ''),
			last_name: String(user.meta?.last_name ?? ''),
			roles: user.roles,
		});
	}, [user]);

	const dirty =
		form.name !== user.name ||
		form.email !== user.email ||
		form.url !== user.url ||
		form.description !== user.description ||
		form.first_name !== String(user.meta?.first_name ?? '') ||
		form.last_name !== String(user.meta?.last_name ?? '') ||
		form.roles.join() !== user.roles.join();

	useUnsavedChanges(dirty);

	const toggleRole = (slug: string, checked: boolean) => setForm({ ...form, roles: checked ? [...form.roles, slug] : form.roles.filter((role) => role !== slug) });

	return (
		<div className="grid gap-6 lg:grid-cols-3">
			<Card title={__('Profile')} className="lg:col-span-2">
				<div className="grid gap-4 sm:grid-cols-2">
					<Input value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} label={__('First name')} />
					<Input value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} label={__('Last name')} />
					<Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} label={__('Display name')} />
					<Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} label={__('Email')} />
					<Input type="url" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} label={__('Website')} />
					<Textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} label={__('Biography')} />
				</div>

				<div className="mt-5 flex justify-end">
					<Button
						icon="save"
						loading={save.isPending}
						disabled={!dirty}
						onClick={() =>
							save.mutate({
								id: user.id,
								data: {
									name: form.name,
									email: form.email,
									url: form.url,
									description: form.description,
									roles: form.roles,
									meta: { first_name: form.first_name, last_name: form.last_name },
								},
							})
						}
					>
						{__('Save changes')}
					</Button>
				</div>
			</Card>

			<Card title={__('Roles')}>
				{rolesQuery.isLoading ? (
					<Skeleton className="h-32 w-full" />
				) : (
					<div className="flex flex-col gap-3">
						{(rolesQuery.data ?? []).map((role) => (
							<Checkbox key={role.slug} checked={form.roles.includes(role.slug)} onCheckedChange={(checked) => toggleRole(role.slug, checked)} label={role.name} />
						))}
					</div>
				)}
			</Card>
		</div>
	);
};

type Activity = {
	id: number;
	action: string;
	object_type?: string;
	object_id?: number;
	created_at: string;
	metadata?: { title?: string };
	new_value?: { title?: string };
};

const ACTION_ICONS: Record<string, { icon: string; tone: string }> = {
	created: { icon: 'add_circle', tone: 'text-success-500' },
	updated: { icon: 'edit', tone: 'text-brand-500' },
	deleted: { icon: 'delete', tone: 'text-error-500' },
	login: { icon: 'login', tone: 'text-success-500' },
	logout: { icon: 'logout', tone: 'text-gray-400' },
};

const titleOf = (activity: Activity) =>
	activity.metadata?.title ?? activity.new_value?.title ?? (activity.object_id ? `${activity.object_type} #${activity.object_id}` : (activity.object_type ?? ''));

export const ActivityPanel = ({ user }: PanelProps) => {
	const rest = useRest();
	const { settings } = useWpData();
	const enabled = settings.enable_activity_logger === true;

	const { data, isLoading } = useQuery({
		queryKey: ['user-activity', user.id],
		enabled,
		queryFn: async ({ signal }) => {
			const result = await rest.list<Activity>('flexify-dashboard/v1/activity-log', { user_id: user.id, per_page: 10, orderby: 'created_at', order: 'DESC' }, signal);

			return result.data ?? [];
		},
	});

	if (!enabled) {
		return (
			<Card>
				<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('The activity log is turned off, so there is nothing to show here.')}</p>
			</Card>
		);
	}

	if (isLoading) {
		return (
			<Card>
				<Skeleton className="h-40 w-full" />
			</Card>
		);
	}

	if (!data?.length) {
		return (
			<Card>
				<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('Nothing recorded for this user yet.')}</p>
			</Card>
		);
	}

	return (
		<Card title={__('Recent activity')}>
			<ul className="space-y-1">
				{data.map((activity) => {
					const look = ACTION_ICONS[activity.action] ?? { icon: 'history', tone: 'text-gray-400' };

					return (
						<li key={activity.id} className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
							<Icon name={look.icon} className={cn('mt-0.5 text-base', look.tone)} />
							<div className="min-w-0 flex-1">
								<p className="truncate text-theme-sm text-gray-800 dark:text-gray-200">{decodeHtml(stripTags(titleOf(activity)))}</p>
								<p className="text-theme-xs text-gray-500 dark:text-gray-400">
									{activity.action} · {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(activity.created_at))}
								</p>
							</div>
						</li>
					);
				})}
			</ul>
		</Card>
	);
};

type Customer = {
	id: number;
	orders_count?: number;
	total_spent?: string;
	billing?: Record<string, string>;
	shipping?: Record<string, string>;
};

type Order = { id: number; number: string; status: string; total: string; currency: string; date_created: string };

export const CommercePanel = ({ user }: PanelProps) => {
	const rest = useRest();
	const { adminUrl } = useWpData();

	const customer = useQuery({
		queryKey: ['woo-customer', user.id],
		retry: false,
		queryFn: ({ signal }) => rest.get<Customer>(`wc/v3/customers/${user.id}`, {}, signal),
	});

	const orders = useQuery({
		queryKey: ['woo-customer-orders', user.id],
		enabled: Boolean(customer.data?.id),
		queryFn: async ({ signal }) => (await rest.list<Order>('wc/v3/orders', { customer: user.id, per_page: 10 }, signal)).data ?? [],
	});

	if (customer.isLoading) {
		return (
			<Card>
				<Skeleton className="h-40 w-full" />
			</Card>
		);
	}

	// A user who never bought anything is not a customer, and WooCommerce says so with a 404.
	if (customer.isError || !customer.data) {
		return (
			<Card>
				<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('This user is not a customer of the store.')}</p>
			</Card>
		);
	}

	const billing = customer.data.billing ?? {};

	return (
		<div className="grid gap-6 lg:grid-cols-3">
			<Card title={__('Customer')} className="lg:col-span-2">
				<div className="mb-5 grid grid-cols-2 gap-4">
					<div>
						<p className="text-theme-xs text-gray-500 dark:text-gray-400">{__('Orders')}</p>
						<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{customer.data.orders_count ?? 0}</p>
					</div>
					<div>
						<p className="text-theme-xs text-gray-500 dark:text-gray-400">{__('Total spent')}</p>
						<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{customer.data.total_spent ?? '0'}</p>
					</div>
				</div>

				<h4 className="mb-2 text-theme-sm font-semibold text-gray-900 dark:text-gray-100">{__('Recent orders')}</h4>

				{orders.isLoading ? (
					<Skeleton className="h-24 w-full" />
				) : !orders.data?.length ? (
					<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('No orders yet.')}</p>
				) : (
					<ul className="space-y-1">
						{orders.data.map((order) => (
							<li key={order.id}>
								<a
									href={`${adminUrl}admin.php?page=wc-orders&action=edit&id=${order.id}`}
									className="flex items-center justify-between gap-3 rounded-xl p-2 text-theme-sm transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
								>
									<span className="font-medium text-gray-800 dark:text-gray-200">#{order.number}</span>
									<Badge variant="light" color="primary">
										{order.status}
									</Badge>
									<span className="text-gray-500 dark:text-gray-400">{new Intl.DateTimeFormat(undefined, { dateStyle: 'short' }).format(new Date(order.date_created))}</span>
									<span className="font-medium text-gray-800 dark:text-gray-200">{order.total}</span>
								</a>
							</li>
						))}
					</ul>
				)}
			</Card>

			<Card title={__('Billing address')}>
				{Object.values(billing).some(Boolean) ? (
					<address className="text-theme-sm not-italic text-gray-700 dark:text-gray-300">
						{[billing.first_name, billing.last_name].filter(Boolean).join(' ')}
						<br />
						{billing.address_1}
						{billing.address_2 ? (
							<>
								<br />
								{billing.address_2}
							</>
						) : null}
						<br />
						{[billing.city, billing.state, billing.postcode].filter(Boolean).join(', ')}
						<br />
						{billing.country}
						{billing.phone ? (
							<>
								<br />
								{billing.phone}
							</>
						) : null}
					</address>
				) : (
					<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('No billing address on file.')}</p>
				)}
			</Card>
		</div>
	);
};

export const PANELS = (): { value: string; label: string; component: (props: PanelProps) => React.ReactNode; requiresPlugin?: string }[] => [
	{ value: 'details', label: __('Details'), component: DetailsPanel },
	{ value: 'activity', label: __('Activity'), component: ActivityPanel },
	{ value: 'commerce', label: __('Commerce'), component: CommercePanel, requiresPlugin: 'woocommerce/woocommerce.php' },
];
