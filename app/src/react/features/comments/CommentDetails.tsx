import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useUnsavedChanges } from '@/react/hooks/useUnsavedChanges';
import { decodeHtml, stripTags } from '@/react/lib/html';
import { __ } from '@/react/lib/i18n';
import { Avatar, Button, Card, Input, PageHeader, Select, Skeleton, Textarea } from '@/react/ui';
import { STATUS_LABELS, postOf, useComment, useCommentMutations } from '@/react/features/comments/queries';

/**
 * One comment, open for moderation: who wrote it, what they wrote, and what was decided.
 */

type Draft = {
	author_name: string;
	author_email: string;
	author_url: string;
	content: string;
	status: string;
};

const draftOf = (comment: { author_name: string; author_email: string; author_url: string; content: { raw?: string; rendered: string }; status: string }): Draft => ({
	author_name: comment.author_name,
	author_email: comment.author_email,
	author_url: comment.author_url,
	// `raw` is what was written; `rendered` is what the site made of it.
	content: comment.content.raw ?? decodeHtml(stripTags(comment.content.rendered)),
	status: comment.status,
});

export const CommentDetails = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const confirm = useConfirm();
	const comment = useComment(Number(id) || null);
	const { save, bulk, remove } = useCommentMutations();
	const [draft, setDraft] = useState<Draft | null>(null);

	useEffect(() => {
		if (comment.data) {
			setDraft(draftOf(comment.data));
		}
	}, [comment.data]);

	const original = comment.data ? draftOf(comment.data) : null;
	const dirty = Boolean(draft && original && JSON.stringify(draft) !== JSON.stringify(original));

	useUnsavedChanges(dirty);

	if (comment.isLoading || !draft) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-64" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	if (comment.isError || !comment.data) {
		return (
			<Card>
				<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('This comment could not be loaded.')}</p>
			</Card>
		);
	}

	const post = postOf(comment.data);
	const labels = STATUS_LABELS();
	const inTrash = comment.data.status === 'trash';

	const askThenRemove = async () => {
		const confirmed = await confirm({
			title: inTrash ? __('Delete permanently?') : __('Move to the trash?'),
			message: inTrash ? __('This comment will be deleted for good. There is no undo.') : __('You can restore it from the trash later.'),
			confirmLabel: inTrash ? __('Delete permanently') : __('Move to the trash'),
			variant: 'danger',
		});

		if (confirmed) {
			bulk.mutate(
				{ ids: [comment.data.id], action: remove(inTrash), message: inTrash ? __('Comment deleted') : __('Comment moved to the trash') },
				{ onSuccess: () => navigate('/') }
			);
		}
	};

	return (
		<>
			<PageHeader
				title={decodeHtml(comment.data.author_name) || __('Anonymous')}
				breadcrumbs={[{ label: __('Comments'), href: '#/' }, { label: __('Comment') }]}
				actions={
					<>
						<Button variant="outline" icon="delete" className="text-error-600" onClick={askThenRemove}>
							{inTrash ? __('Delete permanently') : __('Move to the trash')}
						</Button>
						<Button
							icon="save"
							loading={save.isPending}
							disabled={!dirty}
							onClick={() => save.mutate({ id: comment.data.id, data: { ...draft }, message: __('Comment updated') })}
						>
							{__('Save changes')}
						</Button>
					</>
				}
			/>

			<div className="grid gap-6 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<Textarea rows={8} value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} label={__('Comment')} />
				</Card>

				<div className="flex flex-col gap-6">
					<Card title={__('Author')}>
						<div className="mb-4 flex items-center gap-3">
							<Avatar src={comment.data.author_avatar_urls?.['96']} name={comment.data.author_name} />
							<div className="min-w-0">
								<p className="truncate text-theme-sm font-medium text-gray-900 dark:text-gray-100">{decodeHtml(comment.data.author_name) || __('Anonymous')}</p>
								{comment.data.author_ip ? <p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">{comment.data.author_ip}</p> : null}
							</div>
						</div>

						<div className="flex flex-col gap-4">
							<Input value={draft.author_name} onChange={(event) => setDraft({ ...draft, author_name: event.target.value })} label={__('Name')} />
							<Input type="email" value={draft.author_email} onChange={(event) => setDraft({ ...draft, author_email: event.target.value })} label={__('Email')} />
							<Input type="url" value={draft.author_url} onChange={(event) => setDraft({ ...draft, author_url: event.target.value })} label={__('Website')} />
						</div>
					</Card>

					<Card title={__('Moderation')}>
						<div className="flex flex-col gap-4">
							<Select
									value={draft.status}
									options={Object.entries(labels).map(([value, label]) => ({ value, label }))}
									onChange={(next) => setDraft({ ...draft, status: next })} label={__('Status')} />

							<div>
								<p className="mb-1 text-theme-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{__('In reply to')}</p>
								{post ? (
									<a href={post.link} target="_blank" rel="noopener noreferrer" className="text-theme-sm text-brand-600 hover:underline dark:text-brand-400">
										{decodeHtml(stripTags(post.title?.rendered ?? '')) || __('(No title)')}
									</a>
								) : (
									<p className="text-theme-sm text-gray-500 dark:text-gray-400">—</p>
								)}
							</div>

							<div>
								<p className="mb-1 text-theme-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{__('Date')}</p>
								<p className="text-theme-sm text-gray-700 dark:text-gray-300">
									{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(comment.data.date))}
								</p>
							</div>

							<Button href={comment.data.link} target="_blank" rel="noopener noreferrer" variant="outline" icon="visibility" block>
								{__('View on the site')}
							</Button>
						</div>
					</Card>
				</div>
			</div>
		</>
	);
};
