import { useState } from 'react';
import { decodeHtml, stripTags } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { Badge, Button, Card, Icon, SearchInput, Skeleton } from '@/react/ui';
import { usePluginActions, useRepositorySearch, type Plugin, type RepoPlugin } from '@/react/features/plugins/queries';

/**
 * The WordPress.org plugin directory, searched from here.
 *
 * The directory is public and answers the browser directly; nothing of this site is sent to
 * it beyond what was typed in the search box.
 */

/** The directory gives the plugin's folder; a site has it installed as folder/file.php. */
export const isInstalled = (slug: string, installed: Plugin[]): Plugin | undefined => installed.find((plugin) => plugin.splitSlug === slug || plugin.slug.startsWith(`${slug}/`));

export const formatInstalls = (count?: number): string => {
	if (!count) {
		return '—';
	}

	if (count >= 1_000_000) {
		return `${Math.floor(count / 1_000_000)}M+`;
	}

	if (count >= 1000) {
		return `${Math.floor(count / 1000)}k+`;
	}

	return `${count}+`;
};

const Stars = ({ rating }: { rating?: number }) => {
	// The directory rates out of 100; people read stars.
	const stars = Math.round(((rating ?? 0) / 100) * 5);

	return (
		<span className="flex items-center gap-0.5" aria-label={sprintf(__('%s out of 5'), String(stars))}>
			{Array.from({ length: 5 }, (_, index) => (
				<Icon key={index} name={index < stars ? 'star' : 'star_border'} className="text-theme-sm text-warning-400" />
			))}
		</span>
	);
};

export const PluginRepository = ({ installed }: { installed: Plugin[] }) => {
	const [search, setSearch] = useState('');
	const results = useRepositorySearch(search, 1);
	const { installFromRepo, activate } = usePluginActions();

	return (
		<>
			<Card className="mb-5 p-4">
				<SearchInput
					value={search}
					onChange={setSearch}
					placeholder={__('Search the plugin directory')}
					aria-label={__('Search the plugin directory')}
					className="w-full sm:w-96"
				/>
				<p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">{__('Results come from WordPress.org. Only what you type is sent there.')}</p>
			</Card>

			{!search ? (
				<div className="py-16 text-center">
					<Icon name="search" className="mx-auto mb-3 text-title-md text-gray-300 dark:text-gray-600" />
					<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('Search for a plugin to add it to this site.')}</p>
				</div>
			) : results.isLoading ? (
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{Array.from({ length: 6 }, (_, index) => (
						<Skeleton key={index} className="h-40 w-full" />
					))}
				</div>
			) : results.isError ? (
				<Card>
					<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('The plugin directory could not be reached.')}</p>
				</Card>
			) : !results.data?.plugins.length ? (
				<div className="py-16 text-center">
					<Icon name="search_off" className="mx-auto mb-3 text-title-md text-gray-300 dark:text-gray-600" />
					<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('Nothing in the directory matches that.')}</p>
				</div>
			) : (
				<ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{results.data.plugins.map((plugin: RepoPlugin) => {
						const here = isInstalled(plugin.slug, installed);

						return (
							<li key={plugin.slug}>
								<Card className="flex h-full flex-col">
									<div className="mb-3 flex items-start gap-3">
										{plugin.icons?.['1x'] || plugin.icons?.default ? (
											<img src={plugin.icons['1x'] ?? plugin.icons.default} alt="" aria-hidden className="h-12 w-12 shrink-0 rounded-lg object-cover" />
										) : (
											<span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-800">
												<Icon name="extension" className="text-theme-xl" />
											</span>
										)}

										<div className="min-w-0 flex-1">
											<h3 className="truncate text-theme-sm font-semibold text-gray-900 dark:text-gray-100">{decodeHtml(plugin.name)}</h3>
											<p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">{decodeHtml(stripTags(plugin.author))}</p>
										</div>
									</div>

									<p className="mb-3 line-clamp-3 flex-1 text-theme-xs text-gray-600 dark:text-gray-400">{decodeHtml(plugin.short_description)}</p>

									<div className="mb-3 flex items-center justify-between gap-2">
										<Stars rating={plugin.rating} />
										<span className="text-theme-xs text-gray-500 dark:text-gray-400">{sprintf(__('%s installs'), formatInstalls(plugin.active_installs))}</span>
									</div>

									<div className="flex items-center gap-2">
										{here ? (
											here.active ? (
												<Badge variant="light" color="success">
													{__('Active')}
												</Badge>
											) : (
												<Button variant="outline" size="sm" loading={activate.isPending && activate.variables === here.slug} onClick={() => activate.mutate(here.slug)}>
													{__('Activate')}
												</Button>
											)
										) : (
											<Button
												size="sm"
												icon="download"
												loading={installFromRepo.isPending && installFromRepo.variables === plugin.slug}
												onClick={() => installFromRepo.mutate(plugin.slug)}
											>
												{__('Install')}
											</Button>
										)}

										{plugin.homepage ? (
											<Button variant="ghost" size="sm" href={plugin.homepage} target="_blank" rel="noopener noreferrer" iconOnly icon="open_in_new" aria-label={__('More details')} />
										) : null}
									</div>
								</Card>
							</li>
						);
					})}
				</ul>
			)}
		</>
	);
};
