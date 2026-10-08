import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { decodeHtml } from '@/react/lib/html';
import { __, sprintf } from '@/react/lib/i18n';
import { Button, Card, DataTable, DropdownMenu, Icon, Input, PageHeader, SearchInput, Select, Sheet, Textarea, type Column } from '@/react/ui';
import { useCategories, useWooMutation, wooKeys } from '@/react/woo/queries';
import { useWoo } from '@/react/woo/WooProvider';
import type { Category } from '@/react/woo/types';

/**
 * Category tree with create, edit and delete.
 */

type Row = Category & { depth: number; label: string };

type Form = {
	id: number | null;
	name: string;
	slug: string;
	parent: string;
	description: string;
};

const EMPTY_FORM: Form = { id: null, name: '', slug: '', parent: '0', description: '' };

export const CategoriesView = () => {
	const navigate = useNavigate();
	const confirm = useConfirm();
	const { notify } = useNotify();
	const { wc, store } = useWoo();

	const { data: categories = [], isLoading, refetch } = useCategories();
	const [search, setSearch] = useState('');
	const [sheetOpen, setSheetOpen] = useState(false);
	const [form, setForm] = useState<Form>(EMPTY_FORM);
	const [nameError, setNameError] = useState('');

	const saveCategory = useWooMutation<Category, { id: number | null; data: Record<string, unknown> }>(
		async ({ id, data }) => (await wc<Category>(id ? `products/categories/${id}` : 'products/categories', { method: id ? 'PUT' : 'POST', data })).data as unknown as Category,
		[wooKeys.categories]
	);

	const deleteCategory = useWooMutation<Category, number>(
		async (id) => (await wc<Category>(`products/categories/${id}`, { method: 'DELETE', params: { force: 'true' } })).data as unknown as Category,
		[wooKeys.categories]
	);

	/** Flatten the tree in hierarchical order, carrying the depth for the indentation. */
	const tree = useMemo<Row[]>(() => {
		const byParent = new Map<number, Category[]>();

		categories.forEach((category) => {
			const siblings = byParent.get(category.parent) ?? [];
			siblings.push(category);
			byParent.set(category.parent, siblings);
		});

		const list: Row[] = [];

		const walk = (parent: number, depth: number) => {
			[...(byParent.get(parent) ?? [])]
				.sort((a, b) => decodeHtml(a.name).localeCompare(decodeHtml(b.name)))
				.forEach((category) => {
					list.push({ ...category, depth, label: decodeHtml(category.name) });
					walk(category.id, depth + 1);
				});
		};

		walk(0, 0);

		return list;
	}, [categories]);

	const rows = useMemo(() => {
		const term = search.trim().toLowerCase();

		if (!term) {
			return tree;
		}

		return tree.filter((category) => category.label.toLowerCase().includes(term) || category.slug.includes(term));
	}, [search, tree]);

	const parentOptions = tree
		.filter((category) => category.id !== form.id)
		.map((category) => ({ value: String(category.id), label: `${'— '.repeat(category.depth)}${category.label}` }));

	const openSheet = (category: Row | null = null) => {
		setNameError('');
		setForm({
			id: category?.id ?? null,
			name: category ? category.label : '',
			slug: category?.slug ?? '',
			parent: String(category?.parent ?? 0),
			description: category?.description ?? '',
		});
		setSheetOpen(true);
	};

	const save = async () => {
		if (!form.name.trim()) {
			setNameError(__('The category name is required.'));
			return;
		}

		setNameError('');

		await saveCategory.mutateAsync({
			id: form.id,
			data: { name: form.name.trim(), slug: form.slug.trim(), parent: Number(form.parent) || 0, description: form.description },
		});

		notify({ title: form.id ? __('Category updated') : __('Category created'), tone: 'success' });
		setSheetOpen(false);
		refetch();
	};

	const remove = async (category: Row) => {
		const confirmed = await confirm({
			title: __('Delete category?'),
			message: __('Products in this category will not be deleted.'),
			confirmLabel: __('Delete'),
			variant: 'danger',
		});

		if (!confirmed) {
			return;
		}

		await deleteCategory.mutateAsync(category.id);
		notify({ title: __('Category deleted'), tone: 'success' });
		refetch();
	};

	const columns: Column<Row>[] = [
		{
			key: 'name',
			label: __('Name'),
			cell: (row) => (
				<div className="flex items-center gap-3" style={{ paddingInlineStart: `${row.depth * 1.5}rem` }}>
					<div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
						{row.image?.src ? <img src={row.image.src} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Icon name="category" className="text-theme-lg text-gray-400" />}
					</div>
					<button type="button" className="text-start font-medium text-gray-800 hover:text-brand-500 dark:text-white/90 dark:hover:text-brand-400" onClick={() => openSheet(row)}>
						{row.label}
					</button>
				</div>
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
						{ label: __('View products'), icon: 'inventory', onSelect: () => navigate(`/?category=${row.id}`) },
						{ separator: true },
						{ label: __('Delete'), icon: 'delete', danger: true, onSelect: () => remove(row) },
					]}
					trigger={<Button variant="ghost" size="xs" icon="more_vert" iconOnly aria-label={__('Actions')} />}
				/>
			),
		},
	];

	return (
		<div>
			<PageHeader
				title={__('Product categories')}
				breadcrumbs={[{ label: __('Products'), onClick: () => navigate('/') }, { label: __('Categories') }]}
				actions={
					<>
						<Button variant="outline" icon="open_in_new" href={store.urls.product_categories}>
							{__('Classic screen')}
						</Button>
						<Button icon="add" onClick={() => openSheet()}>
							{__('Add category')}
						</Button>
					</>
				}
			/>

			<Card padding="none">
				<div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:px-6">
					<SearchInput value={search} onChange={setSearch} debounce={150} className="w-full sm:w-80" placeholder={__('Search categories')} />
					<p className="text-theme-sm text-gray-500 dark:text-gray-400 sm:ms-auto">{sprintf(__('%d categories'), categories.length)}</p>
				</div>

				<DataTable columns={columns} rows={rows} loading={isLoading} emptyIcon="category" emptyTitle={__('No categories found')} />
			</Card>

			<Sheet
				open={sheetOpen}
				onOpenChange={setSheetOpen}
				title={form.id ? __('Edit category') : __('Add category')}
				footer={
					<>
						<Button variant="outline" onClick={() => setSheetOpen(false)}>
							{__('Cancel')}
						</Button>
						<Button type="submit" form="fd-category-form" loading={saveCategory.isPending}>
							{form.id ? __('Save changes') : __('Add category')}
						</Button>
					</>
				}
			>
				<form
					id="fd-category-form"
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
					<Select
						value={form.parent}
						onChange={(event) => setForm((current) => ({ ...current, parent: event.target.value }))}
						label={__('Parent category')}
						options={[{ value: '0', label: __('None') }, ...parentOptions]}
					/>
					<Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} label={__('Description')} />
				</form>
			</Sheet>
		</div>
	);
};
