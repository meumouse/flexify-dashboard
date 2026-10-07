import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { decodeHtml } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { Button, Card, DataTable, DropdownMenu, Input, PageHeader, Pagination, SearchInput, Sheet, Textarea, type Column, type RowKey } from '@/react/ui';
import { useTags, useWooMutation, wooKeys } from '@/react/woo/queries';
import { useWoo } from '@/react/woo/WooProvider';
import type { Tag } from '@/react/woo/types';

/**
 * Product tags: paginated list, inline editing and bulk delete.
 */

type Form = {
	id: number | null;
	name: string;
	slug: string;
	description: string;
};

const EMPTY_FORM: Form = { id: null, name: '', slug: '', description: '' };

export const TagsView = () => {
	const navigate = useNavigate();
	const confirm = useConfirm();
	const { notify } = useNotify();
	const { wc, store } = useWoo();

	const [search, setSearch] = useState('');
	const [page, setPage] = useState(1);
	const [perPage, setPerPage] = useState(20);
	const [selected, setSelected] = useState<RowKey[]>([]);
	const [sheetOpen, setSheetOpen] = useState(false);
	const [form, setForm] = useState<Form>(EMPTY_FORM);
	const [nameError, setNameError] = useState('');

	const query = useTags({ page, per_page: perPage, search, orderby: 'name', hide_empty: 'false', _fields: 'id,name,slug,description,count' });
	const rows = query.data?.data ?? [];
	const total = query.data?.totalItems ?? 0;

	const saveTag = useWooMutation<Tag, { id: number | null; data: Record<string, unknown> }>(
		async ({ id, data }) => (await wc<Tag>(id ? `products/tags/${id}` : 'products/tags', { method: id ? 'PUT' : 'POST', data })).data as unknown as Tag,
		[wooKeys.tagsRoot]
	);

	const deleteTags = useWooMutation<unknown, number[]>(async (ids) => wc('products/tags/batch', { method: 'POST', data: { delete: ids } }), [wooKeys.tagsRoot]);

	const openSheet = (tag: Tag | null = null) => {
		setNameError('');
		setForm({ id: tag?.id ?? null, name: tag ? decodeHtml(tag.name) : '', slug: tag?.slug ?? '', description: tag?.description ?? '' });
		setSheetOpen(true);
	};

	const save = async () => {
		if (!form.name.trim()) {
			setNameError(__('The tag name is required.'));
			return;
		}

		setNameError('');
		await saveTag.mutateAsync({ id: form.id, data: { name: form.name.trim(), slug: form.slug.trim(), description: form.description } });
		notify({ title: form.id ? __('Tag updated') : __('Tag created'), tone: 'success' });
		setSheetOpen(false);
		query.refetch();
	};

	const remove = async (ids: number[]) => {
		const confirmed = await confirm({
			title: __('Delete tags?'),
			message: sprintf(__('%d tag(s) will be deleted. Products will not be deleted.'), ids.length),
			confirmLabel: __('Delete'),
			variant: 'danger',
		});

		if (!confirmed) {
			return;
		}

		await deleteTags.mutateAsync(ids);
		notify({ title: __('Tags deleted'), tone: 'success' });
		setSelected([]);
		query.refetch();
	};

	const columns: Column<Tag>[] = [
		{
			key: 'name',
			label: __('Name'),
			cell: (row) => (
				<button type="button" className="text-start font-medium text-gray-800 hover:text-brand-500 dark:text-white/90 dark:hover:text-brand-400" onClick={() => openSheet(row)}>
					{decodeHtml(row.name)}
				</button>
			),
		},
		{ key: 'slug', label: __('Slug') },
		{
			key: 'count',
			label: __('Products'),
			align: 'end',
			cell: (row) => <span className="font-medium text-gray-800 dark:text-white/90">{Number(row.count).toLocaleString()}</span>,
		},
		{
			key: 'actions',
			label: '',
			align: 'end',
			width: '56px',
			cell: (row) => (
				<DropdownMenu
					items={[
						{ label: __('Edit'), icon: 'edit', onSelect: () => openSheet(row) },
						{ label: __('View products'), icon: 'inventory', onSelect: () => navigate(`/?tag=${row.id}`) },
						{ separator: true },
						{ label: __('Delete'), icon: 'delete', danger: true, onSelect: () => remove([row.id]) },
					]}
					trigger={<Button variant="ghost" size="xs" icon="more_vert" iconOnly aria-label={__('Actions')} />}
				/>
			),
		},
	];

	return (
		<div>
			<PageHeader
				title={__('Product tags')}
				breadcrumbs={[{ label: __('Products'), onClick: () => navigate('/') }, { label: __('Tags') }]}
				actions={
					<>
						<Button variant="outline" icon="open_in_new" href={store.urls.product_tags}>
							{__('Classic screen')}
						</Button>
						<Button icon="add" onClick={() => openSheet()}>
							{__('Add tag')}
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
						placeholder={__('Search tags')}
					/>
				</div>

				<DataTable
					columns={columns}
					rows={rows}
					loading={query.isLoading}
					caption={__('Product tags')}
					selectable
					selected={selected}
					onSelectedChange={setSelected}
					emptyIcon="label"
					emptyTitle={search ? __('No tags match your search') : __('No tags yet')}
					bulkActions={({ selected: ids }) => (
						<Button size="xs" variant="danger-outline" icon="delete" onClick={() => remove(ids.map(Number))}>
							{__('Delete')}
						</Button>
					)}
				/>
			</Card>

			<Sheet
				open={sheetOpen}
				onOpenChange={setSheetOpen}
				title={form.id ? __('Edit tag') : __('Add tag')}
				footer={
					<>
						<Button variant="outline" onClick={() => setSheetOpen(false)}>
							{__('Cancel')}
						</Button>
						<Button type="submit" form="fd-tag-form" loading={saveTag.isPending}>
							{form.id ? __('Save changes') : __('Add tag')}
						</Button>
					</>
				}
			>
				<form
					id="fd-tag-form"
					className="space-y-5"
					onSubmit={(event) => {
						event.preventDefault();
						save();
					}}
				>
					<Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} label={__('Name')} error={nameError} required />
					<Input
						value={form.slug}
						onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
						label={__('Slug')}
						hint={__('Leave empty to generate it from the name.')}
					/>
					<Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} label={__('Description')} />
				</form>
			</Sheet>
		</div>
	);
};
