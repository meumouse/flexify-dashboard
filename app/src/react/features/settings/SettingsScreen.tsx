import { useEffect, useMemo, useState } from 'react';
import { settingsConfig, type SettingDefinition } from '@/shared/settings/settings-config.js';
import { useWpData } from '@/react/app/WpDataProvider';
import { useQueryFilters } from '@/react/hooks/useQueryFilters';
import { useUnsavedChanges } from '@/react/hooks/useUnsavedChanges';
import { cn } from '@/react/lib/cn';
import { __, sprintf } from '@/react/lib/i18n';
import { Badge, Button, Card, Icon, PageHeader, SearchInput, Select, Skeleton } from '@/react/ui';
import { CATEGORIES, groupCategories } from '@/react/features/settings/categories';
import { SettingField } from '@/react/features/settings/SettingField';
import { useSaveSettings, useSettings, type Settings } from '@/react/features/settings/queries';

/**
 * The settings screen.
 *
 * What the settings are comes from the schema both screens share, so a setting added there
 * appears here without this file knowing anything about it.
 */

const DEFAULTS = { category: 'general', search: '' };

export const matchesSearch = (setting: SettingDefinition, search: string): boolean => {
	const text = search.toLowerCase();

	return !text || setting.label.toLowerCase().includes(text) || (setting.description ?? '').toLowerCase().includes(text) || setting.id.toLowerCase().includes(text);
};

/** A setting that says when it applies is only shown when it does. */
export const isApplicable = (setting: SettingDefinition, settings: Settings): boolean => {
	if (typeof setting.condition !== 'function') {
		return true;
	}

	try {
		return setting.condition(settings) !== false;
	} catch {
		// A condition that throws is a condition that cannot be met.
		return false;
	}
};

export const SettingsScreen = () => {
	const { settings: printed } = useWpData();
	const { filters, setFilters } = useQueryFilters(DEFAULTS);
	const stored = useSettings();
	const save = useSaveSettings();
	const [draft, setDraft] = useState<Settings | null>(null);

	useEffect(() => {
		if (stored.data) {
			setDraft(stored.data);
		}
	}, [stored.data]);

	const settings = draft ?? {};
	const dirty = Boolean(draft && stored.data && JSON.stringify(draft) !== JSON.stringify(stored.data));

	useUnsavedChanges(dirty);

	const category = String(filters.category);
	const search = String(filters.search);

	// The licence decides what the site may use; without one those settings are shown but
	// cannot be changed, which is more honest than hiding them.
	const licensed = Boolean((printed as { license_key?: string }).license_key);

	const shown = useMemo(
		() => settingsConfig.filter((setting) => (search ? matchesSearch(setting, search) : setting.category === category) && isApplicable(setting, settings)),
		[category, search, settings]
	);

	const counts = useMemo(() => {
		const result: Record<string, number> = {};

		settingsConfig.forEach((setting) => {
			result[setting.category] = (result[setting.category] ?? 0) + 1;
		});

		return result;
	}, []);

	const categories = CATEGORIES();
	const groups = groupCategories(categories);
	const current = categories.find((item) => item.value === category) ?? categories[0];
	const dangerous = category === 'advanced' && !search;

	if (stored.isLoading || !draft) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-64" />
				<Skeleton className="h-96 w-full" />
			</div>
		);
	}

	if (stored.isError) {
		return (
			<Card>
				<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('The settings could not be loaded.')}</p>
			</Card>
		);
	}

	const change = (patch: Settings) => setDraft({ ...settings, ...patch });

	return (
		<>
			<PageHeader title={__('Settings')} description={search ? sprintf(__('%s setting(s) match'), String(shown.length)) : current.description} />

			<div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
				{/* Below 1024px the seventeen sections would push the settings a screen down; a select takes one line. */}
				<div className="flex flex-col gap-3 sm:flex-row lg:hidden">
					<Select
						value={category}
						onChange={(next) => setFilters({ category: next, search: '' })}
						options={groups.map((entry) => ({ label: entry.group, options: entry.items.map((item) => ({ value: item.value, label: item.label })) }))}
						aria-label={__('Settings section')}
						className="sm:flex-1"
					/>
					<SearchInput value={search} onChange={(next) => setFilters({ search: next })} placeholder={__('Search settings')} aria-label={__('Search settings')} className="sm:flex-1" />
				</div>

				<Card className="sticky top-24 hidden max-h-[calc(100vh-8rem)] flex-col self-start p-0 lg:flex">
					<div className="border-b border-gray-100 p-3 dark:border-gray-800">
						<SearchInput value={search} onChange={(next) => setFilters({ search: next })} placeholder={__('Search settings')} aria-label={__('Search settings')} size="sm" />
					</div>

					<nav className="flex-1 overflow-y-auto p-2 custom-scrollbar" aria-label={__('Settings sections')}>
						{groups.map((entry) => (
							<div key={entry.group} className="mb-2 last:mb-0">
								<p className="px-2 pb-1 pt-2 text-theme-2xs font-medium uppercase tracking-wide text-gray-400">{entry.group}</p>
								<ul className="space-y-0.5">
									{entry.items.map((item) => (
										<li key={item.value}>
											<button
												type="button"
												onClick={() => setFilters({ category: item.value, search: '' })}
												className={cn(
													'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-start text-theme-sm transition-colors',
													!search && category === item.value
														? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
														: 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5'
												)}
												aria-current={!search && category === item.value}
											>
												<Icon name={item.icon} className="shrink-0 text-theme-md text-gray-400" />
												<span className="min-w-0 flex-1 truncate">{item.label}</span>
												<span className="shrink-0 text-theme-xs text-gray-400">{counts[item.value] ?? 0}</span>
											</button>
										</li>
									))}
								</ul>
							</div>
						))}
					</nav>
				</Card>

				<div className="min-w-0">
					{!shown.length ? (
						<Card>
							<div className="py-16 text-center">
								<Icon name="search_off" className="mx-auto mb-3 text-title-md text-gray-300 dark:text-gray-600" />
								<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('No setting here matches that.')}</p>
							</div>
						</Card>
					) : (
						<Card
							padding="none"
							title={dangerous ? __('Danger zone') : undefined}
							description={dangerous ? __('Resetting puts every setting back to how the plugin ships, for everyone.') : undefined}
							divided={dangerous}
							className={cn(dangerous && 'border-error-200 dark:border-error-500/30')}
						>
							<ul className="divide-y divide-gray-100 dark:divide-gray-800">
								{shown.map((setting) => {
									const locked = Boolean(setting.requiresActivation) && !licensed;

									return (
										<li key={setting.id} className="grid gap-4 p-5 md:grid-cols-[18rem_1fr]">
											<div className="min-w-0">
												<div className="flex items-center gap-2">
													<h3 className="text-theme-sm font-medium text-gray-900 dark:text-gray-100">{setting.label}</h3>
													{locked ? (
														<Badge variant="light" color="warning">
															{__('Needs a licence')}
														</Badge>
													) : null}
													{search ? <span className="text-theme-xs text-gray-400">{setting.category}</span> : null}
												</div>

												{setting.description ? <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">{setting.description}</p> : null}
											</div>

											<div className={cn('min-w-0', locked && 'pointer-events-none opacity-50')} aria-disabled={locked}>
												<SettingField setting={setting} settings={settings} onChange={change} />
											</div>
										</li>
									);
								})}
							</ul>
						</Card>
					)}

					{dirty ? (
						// Follows the page down: the settings can run long, and the header is gone by the bottom of them.
						<div
							className="sticky bottom-4 z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
							role="status"
						>
							<span className="flex items-center gap-2 text-theme-sm font-medium text-gray-700 dark:text-gray-300">
								<span className="h-2 w-2 rounded-full bg-warning-500" aria-hidden="true" />
								{__('Unsaved changes')}
							</span>
							<div className="flex items-center gap-2">
								<Button variant="outline" size="sm" onClick={() => setDraft(stored.data ?? {})}>
									{__('Discard')}
								</Button>
								<Button size="sm" icon="save" loading={save.isPending} onClick={() => save.mutate(settings)}>
									{__('Save')}
								</Button>
							</div>
						</div>
					) : null}
				</div>
			</div>
		</>
	);
};
