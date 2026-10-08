import { useState } from 'react';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { __ } from '@/react/lib/i18n';
import { Button, Card, Icon, Skeleton, Switch, Textarea, Tooltip } from '@/react/ui';
import { orderKeys, useOrderNotes, useWooMutation } from '@/react/woo/queries';
import { useWoo } from '@/react/woo/WooProvider';
import { formatDate, relativeDate, safeHtml } from '@/react/features/orders/orderFormat';
import type { OrderNote } from '@/react/woo/types';

/**
 * Timeline of private notes, notes sent to the customer and system entries.
 */

// Notes keep WooCommerce markup, which has its own paragraphs and links.
const NOTE_STYLES = '.fd-note-content a{color:rgb(var(--fd-accent-500))}.fd-note-content p{margin:0}';

const noteTone = (note: OrderNote) => {
	if (note.customer_note) {
		return { icon: 'email', classes: 'bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15', label: __('Note to customer') };
	}

	if (note.added_by_user) {
		return { icon: 'person', classes: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400', label: __('Private note') };
	}

	return { icon: 'bolt', classes: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', label: __('System') };
};

type Props = {
	orderId: number;
};

export const OrderNotes = ({ orderId }: Props) => {
	const confirm = useConfirm();
	const { notify } = useNotify();
	const { wc } = useWoo();

	const { data: notes = [], isLoading, refetch } = useOrderNotes(orderId);
	const [content, setContent] = useState('');
	const [customerNote, setCustomerNote] = useState(false);

	const addNote = useWooMutation<OrderNote, { note: string; customer_note: boolean }>(
		async (data) => (await wc<OrderNote>(`orders/${orderId}/notes`, { method: 'POST', data: { ...data, added_by_user: true } })).data as unknown as OrderNote,
		[orderKeys.notes(orderId)]
	);

	const deleteNote = useWooMutation<unknown, number>(async (id) => wc(`orders/${orderId}/notes/${id}`, { method: 'DELETE', params: { force: 'true' } }), [orderKeys.notes(orderId)]);

	const submit = async () => {
		if (!content.trim()) {
			return;
		}

		await addNote.mutateAsync({ note: content, customer_note: customerNote });

		setContent('');
		notify({ title: customerNote ? __('Note sent to customer') : __('Note added'), tone: 'success' });
		setCustomerNote(false);
		refetch();
	};

	const remove = async (note: OrderNote) => {
		const confirmed = await confirm({
			title: __('Delete note?'),
			message: __('This note will be permanently removed from the order.'),
			confirmLabel: __('Delete'),
			variant: 'danger',
		});

		if (!confirmed) {
			return;
		}

		await deleteNote.mutateAsync(note.id);
		notify({ title: __('Note deleted'), tone: 'success' });
		refetch();
	};

	return (
		<Card title={__('Order notes')} divided>
			<style>{NOTE_STYLES}</style>
			<form
				className="mb-6 space-y-3"
				onSubmit={(event) => {
					event.preventDefault();
					submit();
				}}
			>
				<Textarea
					value={content}
					onChange={(event) => setContent(event.target.value)}
					rows={3}
					placeholder={__('Add a note about this order…')}
					aria-label={__('Note')}
				/>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<Switch checked={customerNote} onCheckedChange={setCustomerNote} label={__('Send to customer')} />
					<Button type="submit" size="sm" loading={addNote.isPending} disabled={!content.trim()}>
						{customerNote ? __('Send note') : __('Add note')}
					</Button>
				</div>
			</form>

			{isLoading ? (
				<div className="space-y-4">
					{[0, 1, 2].map((index) => (
						<div key={index} className="flex gap-3">
							<Skeleton className="h-8 w-8 rounded-full" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-4 w-3/4" />
								<Skeleton className="h-3 w-1/3" />
							</div>
						</div>
					))}
				</div>
			) : !notes.length ? (
				<p className="text-center text-theme-sm text-gray-500 dark:text-gray-400">{__('No notes yet.')}</p>
			) : (
				<ol className="relative space-y-5">
					{notes.map((note, index) => {
						const tone = noteTone(note);

						return (
							<li key={note.id} className="group relative flex gap-3">
								{index < notes.length - 1 ? <span className="absolute start-4 top-9 -bottom-5 w-px bg-gray-200 dark:bg-gray-800" aria-hidden="true" /> : null}
								<Tooltip text={tone.label}>
									<span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone.classes}`}>
										<Icon name={tone.icon} className="text-theme-md" />
									</span>
								</Tooltip>
								<div className="min-w-0 flex-1">
									{/* The note HTML comes from WooCommerce and extensions; `safeHtml` keeps only formatting. */}
									<div className="fd-note-content break-words text-theme-sm text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: safeHtml(note.note) }} />
									<p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
										<span title={formatDate(note.date_created, true)}>{relativeDate(note.date_created)}</span>
										{note.author && note.author !== 'system' ? ` · ${note.author}` : null}
									</p>
								</div>
								<Button
									variant="ghost"
									size="xs"
									icon="delete"
									iconOnly
									className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
									aria-label={__('Delete note')}
									onClick={() => remove(note)}
								/>
							</li>
						);
					})}
				</ol>
			)}
		</Card>
	);
};
