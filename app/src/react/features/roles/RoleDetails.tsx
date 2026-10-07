import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUnsavedChanges } from '@/react/hooks/useUnsavedChanges';
import { cn } from '@/react/lib/cn';
import { __, sprintf } from '@/react/lib/i18n';
import { Alert, Button, Card, Checkbox, Icon, Input, PageHeader, SearchInput, Skeleton } from '@/react/ui';
import { GROUP_LABELS, useCapabilities, useRole, useRoleMutations } from '@/react/features/roles/queries';

/**
 * What one role is allowed to do.
 *
 * A site can have hundreds of capabilities, most of them added by plugins, so they are shown
 * in the groups the endpoint sorted them into and can be searched.
 */

export const RoleDetails = () => {
	const { slug } = useParams();
	const navigate = useNavigate();
	const role = useRole(slug ?? null);
	const capabilities = useCapabilities();
	const { saveCapabilities, rename } = useRoleMutations();

	const [chosen, setChosen] = useState<string[]>([]);
	const [name, setName] = useState('');
	const [search, setSearch] = useState('');

	useEffect(() => {
		if (role.data) {
			setChosen(role.data.capabilities);
			setName(role.data.name);
		}
	}, [role.data]);

	const dirty = Boolean(role.data && (chosen.join() !== role.data.capabilities.join() || name !== role.data.name));

	useUnsavedChanges(dirty);

	const groups = useMemo(() => {
		const grouped = capabilities.data?.grouped ?? {};
		const labels = GROUP_LABELS();
		const text = search.toLowerCase();

		return Object.entries(grouped)
			.map(([key, list]) => ({ key, label: labels[key] ?? key, list: list.filter((capability) => !text || capability.toLowerCase().includes(text)) }))
			.filter((group) => group.list.length);
	}, [capabilities.data, search]);

	if (role.isLoading || capabilities.isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-64" />
				<Skeleton className="h-96 w-full" />
			</div>
		);
	}

	if (role.isError || !role.data) {
		return (
			<Card>
				<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('This role could not be loaded.')}</p>
			</Card>
		);
	}

	const toggle = (capability: string, checked: boolean) => setChosen(checked ? [...chosen, capability] : chosen.filter((item) => item !== capability));

	const toggleGroup = (list: string[], checked: boolean) =>
		setChosen(checked ? [...new Set([...chosen, ...list])] : chosen.filter((item) => !list.includes(item)));

	const save = () => {
		if (name !== role.data.name) {
			rename.mutate({ slug: role.data.slug, name });
		}

		if (chosen.join() !== role.data.capabilities.join()) {
			saveCapabilities.mutate({ slug: role.data.slug, capabilities: chosen });
		}
	};

	const isAdministrator = role.data.slug === 'administrator';

	return (
		<>
			<PageHeader
				title={role.data.name}
				breadcrumbs={[{ label: __('Roles'), href: '#/' }, { label: role.data.name }]}
				actions={
					<div className="flex items-center gap-3">
						<Button variant="outline" onClick={() => navigate('/')}>
							{__('Back')}
						</Button>
						<Button icon="save" loading={saveCapabilities.isPending || rename.isPending} disabled={!dirty} onClick={save}>
							{__('Save changes')}
						</Button>
					</div>
				}
			/>

			{isAdministrator ? (
				<Alert variant="warning" title={__('This is the administrator role.')} className="mb-5">
					{__('Taking capabilities away from it can lock everyone out of parts of the site, including this screen.')}
				</Alert>
			) : null}

			<div className="grid gap-6 lg:grid-cols-4">
				<div className="flex flex-col gap-6">
					<Card title={__('Role')}>
						<Input value={name} onChange={(event) => setName(event.target.value)} label={__('Name')} />

						<dl className="mt-4 space-y-2 text-theme-sm">
							<div className="flex justify-between gap-4">
								<dt className="text-gray-500 dark:text-gray-400">{__('Slug')}</dt>
								<dd className="font-medium text-gray-800 dark:text-white/90">{role.data.slug}</dd>
							</div>
							<div className="flex justify-between gap-4">
								<dt className="text-gray-500 dark:text-gray-400">{__('People')}</dt>
								<dd className="font-medium text-gray-800 dark:text-white/90">{role.data.user_count ?? 0}</dd>
							</div>
							<div className="flex justify-between gap-4">
								<dt className="text-gray-500 dark:text-gray-400">{__('Capabilities')}</dt>
								<dd className="font-medium text-gray-800 dark:text-white/90">{chosen.length}</dd>
							</div>
						</dl>
					</Card>
				</div>

				<div className="lg:col-span-3">
					<Card className="p-0">
						<div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4 dark:border-gray-800">
							<SearchInput value={search} onChange={setSearch} placeholder={__('Search capabilities')} aria-label={__('Search capabilities')} className="w-full sm:w-72" />
							<span className="text-theme-sm text-gray-500 dark:text-gray-400">{sprintf(__('%1$s of %2$s'), String(chosen.length), String(capabilities.data?.all.length ?? 0))}</span>
						</div>

						<div className="max-h-[36rem] overflow-y-auto p-4 custom-scrollbar">
							{!groups.length ? (
								<div className="py-12 text-center">
									<Icon name="search_off" className="mx-auto mb-3 text-3xl text-gray-300 dark:text-gray-600" />
									<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('No capability matches that.')}</p>
								</div>
							) : (
								<div className="flex flex-col gap-6">
									{groups.map((group) => {
										const all = group.list.every((capability) => chosen.includes(capability));
										const some = !all && group.list.some((capability) => chosen.includes(capability));

										return (
											<section key={group.key}>
												<div className="mb-2 flex items-center justify-between gap-3 border-b border-gray-100 pb-2 dark:border-gray-800">
													<h3 className="text-theme-sm font-semibold text-gray-900 dark:text-gray-100">{group.label}</h3>
													<Checkbox checked={all} indeterminate={some} onCheckedChange={(checked) => toggleGroup(group.list, checked)} label={__('All')} size="sm" />
												</div>

												<div className={cn('grid gap-2 sm:grid-cols-2 xl:grid-cols-3')}>
													{group.list.map((capability) => (
														<Checkbox
															key={capability}
															size="sm"
															checked={chosen.includes(capability)}
															onCheckedChange={(checked) => toggle(capability, checked)}
															label={capability}
														/>
													))}
												</div>
											</section>
										);
									})}
								</div>
							)}
						</div>
					</Card>
				</div>
			</div>
		</>
	);
};
