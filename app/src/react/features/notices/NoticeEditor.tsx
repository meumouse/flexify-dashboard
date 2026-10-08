import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useUnsavedChanges } from '@/react/hooks/useUnsavedChanges';
import { cn } from '@/react/lib/cn';
import { decodeHtml, stripTags } from '@/react/lib/html';
import { __ } from '@/react/lib/i18n';
import { Alert, Button, Card, Checkbox, Field, Icon, Input, PageHeader, RichText, Skeleton, Switch } from '@/react/ui';
import { useRoles } from '@/react/features/users/queries';
import { NOTICE_TYPES, useNoticeItem, useNoticeMutations, type Notice } from '@/react/features/notices/queries';

/**
 * Writing a notice: what it says, how loudly, who sees it and whether it can be dismissed.
 */

type Draft = {
	title: string;
	content: string;
	notice_type: string;
	roles: string[];
	dismissible: boolean;
	active: boolean;
};

const EMPTY: Draft = { title: '', content: '', notice_type: 'info', roles: [], dismissible: true, active: true };

const draftOf = (notice: Notice): Draft => ({
	title: notice.title.raw ?? decodeHtml(stripTags(notice.title.rendered)),
	content: notice.content.raw ?? notice.content.rendered,
	notice_type: notice.meta?.notice_type ?? 'info',
	roles: notice.meta?.roles ?? [],
	dismissible: notice.meta?.dismissible ?? true,
	active: notice.status === 'publish',
});

export const NoticeEditor = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const confirm = useConfirm();
	const isNew = id === 'new';
	const notice = useNoticeItem(isNew ? null : Number(id) || null);
	const rolesQuery = useRoles();
	const { save, remove } = useNoticeMutations();
	const [draft, setDraft] = useState<Draft>(EMPTY);
	const [loaded, setLoaded] = useState(isNew);

	useEffect(() => {
		if (notice.data) {
			setDraft(draftOf(notice.data));
			setLoaded(true);
		}
	}, [notice.data]);

	const original = notice.data ? draftOf(notice.data) : EMPTY;
	const dirty = JSON.stringify(draft) !== JSON.stringify(original);

	useUnsavedChanges(dirty);

	if (!loaded && notice.isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-64" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	const types = NOTICE_TYPES();
	const chosenType = types.find((type) => type.value === draft.notice_type) ?? types[0];

	const submit = () =>
		save.mutate(
			{
				id: isNew ? undefined : Number(id),
				data: {
					title: draft.title,
					content: draft.content,
					status: draft.active ? 'publish' : 'draft',
					meta: { notice_type: draft.notice_type, roles: draft.roles, dismissible: draft.dismissible },
				},
			},
			{ onSuccess: (saved) => (isNew ? navigate(`/notice/${saved.id}`, { replace: true }) : undefined) }
		);

	const askThenDelete = async () => {
		const confirmed = await confirm({
			title: __('Delete this notice?'),
			message: __('It stops being shown and cannot be brought back.'),
			confirmLabel: __('Delete'),
			variant: 'danger',
		});

		if (confirmed) {
			remove.mutate(Number(id), { onSuccess: () => navigate('/') });
		}
	};

	const toggleRole = (slug: string, checked: boolean) => setDraft({ ...draft, roles: checked ? [...draft.roles, slug] : draft.roles.filter((role) => role !== slug) });

	return (
		<>
			<PageHeader
				title={isNew ? __('New notice') : draft.title || __('(No title)')}
				breadcrumbs={[{ label: __('Admin notices'), href: '#/' }, { label: isNew ? __('New') : __('Edit') }]}
				actions={
					<>
						{!isNew ? (
							<Button variant="outline" icon="delete" className="text-error-600" onClick={askThenDelete}>
								{__('Delete')}
							</Button>
						) : null}
						<Button icon="save" loading={save.isPending} disabled={!dirty || !draft.title} onClick={submit}>
							{__('Save')}
						</Button>
					</>
				}
			/>

			<div className="grid gap-6 lg:grid-cols-3">
				<div className="flex flex-col gap-6 lg:col-span-2">
					<Card>
						<div className="flex flex-col gap-4">
							<Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} label={__('Title')} />

							<Field label={__('Message')}>
								<RichText value={draft.content} onChange={(content) => setDraft({ ...draft, content })} />
							</Field>
						</div>
					</Card>

					<Card title={__('How it will look')}>
						{/* The message is what was written here, shown the way wp-admin will show it. */}
						<Alert variant={draft.notice_type === 'info' ? 'info' : (draft.notice_type as 'success' | 'warning' | 'error')} title={draft.title || __('(No title)')}>
							<div dangerouslySetInnerHTML={{ __html: draft.content }} />
						</Alert>
					</Card>
				</div>

				<div className="flex flex-col gap-6">
					<Card title={__('Kind')}>
						<div className="grid grid-cols-2 gap-2">
							{types.map((type) => (
								<button
									key={type.value}
									type="button"
									onClick={() => setDraft({ ...draft, notice_type: type.value })}
									className={cn(
										'flex items-center gap-2 rounded-xl border p-3 text-theme-sm transition-colors',
										chosenType.value === type.value
											? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
											: 'border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5'
									)}
								>
									<Icon name={type.icon} className={cn('text-theme-md', type.tone)} />
									<span className="truncate text-gray-700 dark:text-gray-300">{type.label}</span>
								</button>
							))}
						</div>
					</Card>

					<Card title={__('Who sees it')}>
						{rolesQuery.isLoading ? (
							<Skeleton className="h-28 w-full" />
						) : (
							<>
								<p className="mb-3 text-theme-xs text-gray-500 dark:text-gray-400">{__('With nothing chosen, everyone sees it.')}</p>
								<div className="flex flex-col gap-3">
									{(rolesQuery.data ?? []).map((role) => (
										<Checkbox key={role.slug} checked={draft.roles.includes(role.slug)} onCheckedChange={(checked) => toggleRole(role.slug, checked)} label={role.name} />
									))}
								</div>
							</>
						)}
					</Card>

					<Card title={__('Behaviour')}>
						<div className="flex flex-col gap-4">
							<Switch checked={draft.active} onCheckedChange={(active) => setDraft({ ...draft, active })} label={__('Show this notice')} />
							<Switch
								checked={draft.dismissible}
								onCheckedChange={(dismissible) => setDraft({ ...draft, dismissible })}
								label={__('Can be dismissed')}
								description={__('Once dismissed, that person does not see it again.')}
							/>
						</div>
					</Card>

					{!isNew && notice.data?.meta?.seen_by?.length ? (
						<Card title={__('Seen by')}>
							<p className="text-theme-sm text-gray-700 dark:text-gray-300">{notice.data.meta.seen_by.length}</p>
						</Card>
					) : null}
				</div>
			</div>
		</>
	);
};
