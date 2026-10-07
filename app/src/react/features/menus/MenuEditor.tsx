import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useUnsavedChanges } from '@/react/hooks/useUnsavedChanges';
import { cn } from '@/react/lib/cn';
import { decodeHtml, stripTags } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { Alert, Button, Card, Checkbox, Icon, Input, PageHeader, Skeleton, Switch } from '@/react/ui';
import { EntityPicker, userItem } from '@/react/data/EntityPicker';
import { useRoles } from '@/react/features/users/queries';
import { findItem, idAt, moveItem, newCustomChild, newCustomItem, removeItem, restoreMissing, updateItem, type Where } from '@/react/features/menus/menuEdits';
import { useMenu, useMenuMutations, type MenuAudience } from '@/react/features/menus/queries';
import { processMenu } from '@/react/shell/menu/parse';
import type { MenuItem, SubMenuItem } from '@/react/shell/menu/types';

/**
 * Building one menu: the items on the left, what the chosen one says on the right, and who
 * the whole thing is for.
 */

const labelOf = (item: { name?: string; settings?: { name?: string } }) => item.settings?.name || item.name || '';

export const MenuEditor = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const confirm = useConfirm();
	const menu = useMenu(Number(id) || null);
	const rolesQuery = useRoles();
	const { save, remove } = useMenuMutations();

	const [title, setTitle] = useState('');
	const [published, setPublished] = useState(false);
	const [items, setItems] = useState<MenuItem[]>([]);
	const [audience, setAudience] = useState<MenuAudience>({ applies_to_everyone: false, includes: [], excludes: [], roles: [] });
	const [selected, setSelected] = useState<string | null>(null);
	const [loaded, setLoaded] = useState(false);

	// What the site's own menu looks like right now, read from the page the admin printed.
	const native = useMemo(() => processMenu(document.querySelector('#adminmenumain')).menu, []);

	useEffect(() => {
		if (!menu.data || loaded) {
			return;
		}

		setTitle(menu.data.title.raw ?? decodeHtml(stripTags(menu.data.title.rendered)));
		setPublished(menu.data.status === 'publish');
		setItems(restoreMissing(menu.data.meta?.menu_items ?? [], native));
		setAudience({ applies_to_everyone: false, includes: [], excludes: [], roles: [], ...(menu.data.meta?.menu_settings ?? {}) });
		setLoaded(true);
	}, [loaded, menu.data, native]);

	const original = menu.data;
	const dirty =
		loaded &&
		Boolean(
			original &&
				(title !== (original.title.raw ?? decodeHtml(stripTags(original.title.rendered))) ||
					published !== (original.status === 'publish') ||
					JSON.stringify(items) !== JSON.stringify(restoreMissing(original.meta?.menu_items ?? [], native)) ||
					JSON.stringify(audience) !== JSON.stringify({ applies_to_everyone: false, includes: [], excludes: [], roles: [], ...(original.meta?.menu_settings ?? {}) }))
		);

	useUnsavedChanges(dirty);

	if (menu.isLoading || !loaded) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-64" />
				<Skeleton className="h-96 w-full" />
			</div>
		);
	}

	if (menu.isError || !menu.data) {
		return (
			<Card>
				<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('This menu could not be loaded.')}</p>
			</Card>
		);
	}

	const where: Where | null = selected ? findItem(items, selected) : null;
	const current = where ? (where.child === null ? items[where.parent] : items[where.parent].submenu?.[where.child]) : null;

	const change = (patch: Partial<MenuItem>) => (where ? setItems(updateItem(items, where, patch)) : undefined);
	const changeSettings = (patch: Record<string, unknown>) => (current ? change({ settings: { ...current.settings, ...patch } }) : undefined);

	const move = (direction: -1 | 1) => {
		if (!where) {
			return;
		}

		const next = moveItem(items, where, direction);
		setItems(next);
		setSelected(idAt(next, { parent: where.parent + (where.child === null ? direction : 0), child: where.child === null ? null : where.child + direction }) ?? selected);
	};

	const askThenDelete = async () => {
		const confirmed = await confirm({
			title: __('Delete this menu?'),
			message: __('The people it applied to go back to the menu WordPress builds.'),
			confirmLabel: __('Delete'),
			variant: 'danger',
		});

		if (confirmed) {
			remove.mutate(menu.data.id, { onSuccess: () => navigate('/') });
		}
	};

	const submit = () =>
		save.mutate({
			id: menu.data.id,
			data: {
				title,
				status: published ? 'publish' : 'draft',
				meta: { menu_items: items, menu_settings: audience },
			},
		});

	const Row = ({ item, nested, position }: { item: MenuItem | SubMenuItem; nested?: boolean; position: Where }) =>
		// WordPress separates groups of items with an entry that is only a line.
		'type' in item && item.type === 'separator' ? (
			<span className="my-1 block h-px bg-gray-100 dark:bg-gray-800" role="separator" />
		) : (
			<button
			type="button"
			onClick={() => setSelected(item.id)}
			className={cn(
				'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-theme-sm transition-colors',
				nested && 'ms-6',
				selected === item.id ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300' : 'hover:bg-gray-50 dark:hover:bg-white/5',
				item.settings?.hidden && 'opacity-50'
			)}
			aria-current={selected === item.id}
		>
			<Icon name={item.settings?.hidden ? 'visibility_off' : item.custom ? 'link' : 'drag_indicator'} className="shrink-0 text-base text-gray-400" />
			<span className="min-w-0 flex-1 truncate">{decodeHtml(stripTags(labelOf(item))) || __('(No label)')}</span>
			{position.child === null && items[position.parent]?.submenu?.length ? <span className="shrink-0 text-theme-xs text-gray-400">{items[position.parent].submenu?.length}</span> : null}
			</button>
		);

	return (
		<>
			<PageHeader
				title={title || __('(No title)')}
				breadcrumbs={[{ label: __('Admin menus'), href: '#/' }, { label: __('Edit') }]}
				actions={
					<div className="flex items-center gap-3">
						<Button variant="outline" icon="delete" className="text-error-600" onClick={askThenDelete}>
							{__('Delete')}
						</Button>
						<Button icon="save" loading={save.isPending} disabled={!dirty} onClick={submit}>
							{__('Save')}
						</Button>
					</div>
				}
			/>

			<div className="grid gap-6 lg:grid-cols-3">
				<Card className="flex max-h-[40rem] flex-col p-0">
					<div className="flex items-center justify-between gap-2 border-b border-gray-100 p-3 dark:border-gray-800">
						<h3 className="text-theme-sm font-semibold text-gray-900 dark:text-gray-100">{__('Items')}</h3>
						<div className="flex items-center gap-1">
							<Button variant="ghost" size="xs" iconOnly icon="expand_less" disabled={!where} onClick={() => move(-1)} aria-label={__('Move up')} />
							<Button variant="ghost" size="xs" iconOnly icon="expand_more" disabled={!where} onClick={() => move(1)} aria-label={__('Move down')} />
							<Button
								variant="ghost"
								size="xs"
								iconOnly
								icon="add"
								onClick={() => {
									const item = newCustomItem();
									setItems([item, ...items]);
									setSelected(item.id);
								}}
								aria-label={__('Add a link')}
							/>
						</div>
					</div>

					<div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
						<ul className="space-y-0.5">
							{items.map((item, parent) => (
								<li key={item.id}>
									<Row item={item} position={{ parent, child: null }} />
									{item.submenu?.length ? (
										<ul className="mt-0.5 space-y-0.5">
											{item.submenu.map((entry, child) => (
												<li key={entry.id}>
													<Row item={entry} nested position={{ parent, child }} />
												</li>
											))}
										</ul>
									) : null}
								</li>
							))}
						</ul>
					</div>
				</Card>

				<div className="flex flex-col gap-6 lg:col-span-2">
					<Card title={__('Menu')}>
						<div className="flex flex-col gap-4">
							<Input value={title} onChange={(event) => setTitle(event.target.value)} label={__('Name')} hint={__('Only you see this; it is how you tell your menus apart.')} />
							<Switch checked={published} onCheckedChange={setPublished} label={__('Use this menu')} description={__('A draft is kept but shown to nobody.')} />
						</div>
					</Card>

					{current && where ? (
						<Card title={__('Chosen item')}>
							<div className="flex flex-col gap-4">
								<Input
									value={current.settings?.name ?? current.name ?? ''}
									onChange={(event) => changeSettings({ name: event.target.value })}
									label={__('Label')}
									hint={current.custom ? undefined : sprintf(__('WordPress calls it %s.'), stripTags(current.name ?? ''))}
								/>

								{current.custom ? <Input value={current.url ?? ''} onChange={(event) => change({ url: event.target.value })} label={__('Address')} /> : null}

								<Input value={current.settings?.icon ?? ''} onChange={(event) => changeSettings({ icon: event.target.value })} label={__('Icon')} hint={__('A Dashicons name, for example dashicons-cart.')} />

								<Switch checked={Boolean(current.settings?.hidden)} onCheckedChange={(hidden) => changeSettings({ hidden })} label={__('Hide this item')} />
								<Switch checked={Boolean(current.settings?.open_new)} onCheckedChange={(open_new) => changeSettings({ open_new })} label={__('Open in a new tab')} />

								<div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
									{where.child === null ? (
										<Button
											variant="outline"
											size="sm"
											icon="subdirectory_arrow_right"
											onClick={() => {
												const child = newCustomChild();
												setItems(updateItem(items, where, { submenu: [...(items[where.parent].submenu ?? []), child] }));
												setSelected(child.id);
											}}
										>
											{__('Add a link under it')}
										</Button>
									) : null}

									<Button variant="ghost" size="sm" icon="restart_alt" onClick={() => change({ settings: {} })}>
										{__('Undo my changes to it')}
									</Button>

									<Button
										variant="ghost"
										size="sm"
										icon="delete"
										className="text-error-600"
										onClick={() => {
											setItems(removeItem(items, where));
											setSelected(null);
										}}
									>
										{__('Remove from this menu')}
									</Button>
								</div>
							</div>
						</Card>
					) : (
						<Card>
							<p className="py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">{__('Choose an item on the left to change it.')}</p>
						</Card>
					)}

					<Card title={__('Who gets this menu')}>
						<div className="flex flex-col gap-4">
							<Switch
								checked={Boolean(audience.applies_to_everyone)}
								onCheckedChange={(applies_to_everyone) => setAudience({ ...audience, applies_to_everyone })}
								label={__('Everyone on this site')}
							/>

							{!audience.applies_to_everyone ? (
								<>
									<div>
										<p className="mb-2 text-theme-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{__('Roles')}</p>
										<div className="flex flex-wrap gap-3">
											{(rolesQuery.data ?? []).map((role) => (
												<Checkbox
													key={role.slug}
													size="sm"
													checked={(audience.roles ?? []).includes(role.slug)}
													onCheckedChange={(checked) =>
														setAudience({
															...audience,
															roles: checked ? [...(audience.roles ?? []), role.slug] : (audience.roles ?? []).filter((item) => item !== role.slug),
														})
													}
													label={role.name}
												/>
											))}
										</div>
									</div>

									<div className="grid gap-4 sm:grid-cols-2">
										<div>
											<p className="mb-2 text-theme-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{__('Also these people')}</p>
											<EntityPicker endpoint="wp/v2/users" toItem={userItem} value={audience.includes ?? []} onChange={(includes) => setAudience({ ...audience, includes })} placeholder={__('Nobody in particular')} />
										</div>
										<div>
											<p className="mb-2 text-theme-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{__('Except these people')}</p>
											<EntityPicker endpoint="wp/v2/users" toItem={userItem} value={audience.excludes ?? []} onChange={(excludes) => setAudience({ ...audience, excludes })} placeholder={__('Nobody excluded')} />
										</div>
									</div>
								</>
							) : null}

							<Alert variant="info" title={__('A saved menu reaches people when the cache turns over.')}>
								{__('Use “Apply to everyone now” on the menu list to make it immediate.')}
							</Alert>
						</div>
					</Card>
				</div>
			</div>
		</>
	);
};
