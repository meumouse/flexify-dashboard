import { useMemo, useRef } from 'react';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useQueryFilters } from '@/react/hooks/useQueryFilters';
import { cn } from '@/react/lib/cn';
import { decodeHtml, stripTags } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { Badge, Button, Card, DropdownMenu, Icon, PageHeader, SearchInput, Skeleton, Switch, Tabs, type TabItem } from '@/react/ui';
import { PluginRepository } from '@/react/features/plugins/PluginRepository';
import { usePluginActions, usePlugins, useUploadPlugin, type Plugin } from '@/react/features/plugins/queries';

/**
 * The plugins screen: what is installed, what needs updating, and the directory to add more.
 */

const DEFAULTS = { view: 'installed', search: '' };

const matches = (plugin: Plugin, search: string) => {
	const text = search.toLowerCase();

	return !text || plugin.Name.toLowerCase().includes(text) || stripTags(plugin.Description).toLowerCase().includes(text) || plugin.Author.toLowerCase().includes(text);
};

const PluginRow = ({ plugin }: { plugin: Plugin }) => {
	const confirm = useConfirm();
	const { activate, deactivate, update, remove, toggleAutoUpdate } = usePluginActions();
	const busy = [activate, deactivate, update, remove].some((action) => action.isPending && action.variables === plugin.slug);

	const askThenDelete = async () => {
		const confirmed = await confirm({
			title: __('Delete this plugin?'),
			message: sprintf(__('%s and its files are removed from the site. Anything it stored in the database may stay behind.'), plugin.Name),
			confirmLabel: __('Delete'),
			variant: 'danger',
		});

		if (confirmed) {
			remove.mutate(plugin.slug);
		}
	};

	return (
		<li className="flex flex-wrap items-start gap-4 p-4">
			<div className="min-w-0 flex-1">
				<div className="mb-1 flex flex-wrap items-center gap-2">
					<h3 className="truncate text-theme-sm font-semibold text-gray-900 dark:text-gray-100">{decodeHtml(plugin.Name)}</h3>
					<span className="text-theme-xs text-gray-400">{plugin.Version}</span>
					{plugin.active ? (
						<Badge variant="light" color="success">
							{__('Active')}
						</Badge>
					) : null}
					{plugin.has_update ? (
						<Badge variant="light" color="warning">
							{__('Update available')}
						</Badge>
					) : null}
				</div>

				<p className="line-clamp-2 text-theme-xs text-gray-500 dark:text-gray-400">{decodeHtml(stripTags(plugin.Description))}</p>

				<p className="mt-1 text-theme-xs text-gray-400">
					{plugin.AuthorURI ? (
						<a href={plugin.AuthorURI} target="_blank" rel="noopener noreferrer" className="hover:underline">
							{decodeHtml(stripTags(plugin.Author))}
						</a>
					) : (
						decodeHtml(stripTags(plugin.Author))
					)}
				</p>
			</div>

			<div className="flex shrink-0 items-center gap-2">
				<Switch
					checked={plugin.auto_update_enabled}
					onCheckedChange={() => toggleAutoUpdate.mutate(plugin.slug)}
					label={__('Auto-update')}
					size="sm"
					className="hidden lg:flex"
				/>

				{plugin.has_update ? (
					<Button size="sm" icon="system_update_alt" loading={update.isPending && update.variables === plugin.slug} onClick={() => update.mutate(plugin.slug)}>
						{__('Update')}
					</Button>
				) : null}

				{plugin.active ? (
					<Button variant="outline" size="sm" loading={busy} onClick={() => deactivate.mutate(plugin.slug)}>
						{__('Deactivate')}
					</Button>
				) : (
					<Button variant="outline" size="sm" loading={busy} onClick={() => activate.mutate(plugin.slug)}>
						{__('Activate')}
					</Button>
				)}

				<DropdownMenu
					items={[
						...(plugin.action_links ?? []).map((link) => ({ label: decodeHtml(stripTags(link.label)), href: link.url })),
						...(plugin.action_links?.length ? [{ separator: true as const }] : []),
						...(plugin.PluginURI ? [{ label: __('Visit the plugin site'), icon: 'open_in_new', href: plugin.PluginURI, target: '_blank' }] : []),
						{ label: __('Auto-update'), icon: plugin.auto_update_enabled ? 'toggle_on' : 'toggle_off', onSelect: () => toggleAutoUpdate.mutate(plugin.slug) },
						{ separator: true },
						{ label: __('Delete'), icon: 'delete', danger: true, disabled: plugin.active, onSelect: askThenDelete },
					]}
					trigger={<Button variant="ghost" size="sm" iconOnly icon="more_vert" aria-label={sprintf(__('Actions for %s'), plugin.Name)} />}
				/>
			</div>
		</li>
	);
};

export const PluginsList = () => {
	const { filters, setFilters } = useQueryFilters(DEFAULTS);
	const plugins = usePlugins();
	const upload = useUploadPlugin();
	const fileInput = useRef<HTMLInputElement>(null);

	const [search, view] = [String(filters.search), String(filters.view)];
	const all = plugins.data ?? [];

	const shown = useMemo(() => {
		const byView = view === 'active' ? all.filter((plugin) => plugin.active) : view === 'inactive' ? all.filter((plugin) => !plugin.active) : view === 'updates' ? all.filter((plugin) => plugin.has_update) : all;

		return byView.filter((plugin) => matches(plugin, search));
	}, [all, search, view]);

	const counts = {
		installed: all.length,
		active: all.filter((plugin) => plugin.active).length,
		inactive: all.filter((plugin) => !plugin.active).length,
		updates: all.filter((plugin) => plugin.has_update).length,
	};

	const tabs: TabItem[] = [
		{ value: 'installed', label: `${__('Installed')} (${counts.installed})` },
		{ value: 'active', label: `${__('Active')} (${counts.active})` },
		{ value: 'inactive', label: `${__('Inactive')} (${counts.inactive})` },
		{ value: 'updates', label: `${__('Updates')} (${counts.updates})` },
		{ value: 'add', label: __('Add new') },
	];

	return (
		<>
			<PageHeader
				title={__('Plugins')}
				description={sprintf(__('%s installed'), String(counts.installed))}
				actions={
					<Button variant="outline" icon="upload" loading={upload.isPending} onClick={() => fileInput.current?.click()}>
						{__('Upload a ZIP')}
					</Button>
				}
			/>

			<input
				ref={fileInput}
				type="file"
				accept=".zip,application/zip"
				className="hidden"
				aria-hidden
				tabIndex={-1}
				onChange={(event) => {
					const file = event.target.files?.[0];
					event.target.value = '';

					if (file) {
						upload.mutate(file);
					}
				}}
			/>

			<Tabs items={tabs} value={view} onChange={(next) => setFilters({ view: next })} className="mb-5" />

			{view === 'add' ? (
				<PluginRepository installed={all} />
			) : (
				<Card className="p-0">
					<div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4 dark:border-gray-800">
						<SearchInput
							value={search}
							onChange={(next) => setFilters({ search: next })}
							placeholder={__('Search installed plugins')}
							aria-label={__('Search installed plugins')}
							className="w-full sm:w-72"
						/>

						{plugins.isFetching ? <Icon name="progress_activity" className="ms-auto animate-spin text-base text-gray-400" /> : null}
					</div>

					{plugins.isLoading ? (
						<div className="space-y-2 p-4">
							{Array.from({ length: 6 }, (_, index) => (
								<Skeleton key={index} className="h-20 w-full" />
							))}
						</div>
					) : !shown.length ? (
						<div className="py-16 text-center">
							<Icon name="extension" className="mx-auto mb-3 text-4xl text-gray-300 dark:text-gray-600" />
							<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('No plugin here matches that.')}</p>
						</div>
					) : (
						<ul className={cn('divide-y divide-gray-100 dark:divide-gray-800')}>
							{shown.map((plugin) => (
								<PluginRow key={plugin.slug} plugin={plugin} />
							))}
						</ul>
					)}
				</Card>
			)}
		</>
	);
};
