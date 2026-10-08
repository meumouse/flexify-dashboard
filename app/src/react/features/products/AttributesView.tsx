import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { __, sprintf } from '@/react/lib/i18n';
import { Button, Card, Checkbox, DataTable, DropdownMenu, Icon, Input, PageHeader, Select, Sheet, Skeleton, type Column } from '@/react/ui';
import { useAttributes, useWooMutation, wooKeys } from '@/react/woo/queries';
import { useWoo } from '@/react/woo/WooProvider';
import type { Attribute, AttributeTerm } from '@/react/woo/types';

/**
 * Global attributes and their values.
 *
 * Terms load in one go inside the side panel instead of a query hook, because the panel
 * edits the list in place and only ever shows one attribute at a time.
 */

type Form = {
	id: number | null;
	name: string;
	slug: string;
	order_by: string;
	has_archives: boolean;
};

const EMPTY_FORM: Form = { id: null, name: '', slug: '', order_by: 'menu_order', has_archives: false };

export const AttributesView = () => {
	const navigate = useNavigate();
	const confirm = useConfirm();
	const { notify } = useNotify();
	const { wc } = useWoo();

	const { data: attributes = [], isLoading, refetch } = useAttributes();

	const [editorOpen, setEditorOpen] = useState(false);
	const [form, setForm] = useState<Form>(EMPTY_FORM);
	const [nameError, setNameError] = useState('');

	const [termsSheet, setTermsSheet] = useState<{ open: boolean; attribute: Attribute | null; terms: AttributeTerm[]; loading: boolean }>({
		open: false,
		attribute: null,
		terms: [],
		loading: false,
	});
	const [newTerm, setNewTerm] = useState('');
	const [editingTerm, setEditingTerm] = useState<{ id: number; name: string } | null>(null);

	const orderOptions = [
		{ value: 'menu_order', label: __('Custom ordering') },
		{ value: 'name', label: __('Name') },
		{ value: 'name_num', label: __('Name (numeric)') },
		{ value: 'id', label: __('Term ID') },
	];

	const orderLabel = (value: string) => orderOptions.find((option) => option.value === value)?.label ?? value;

	const saveAttributeMutation = useWooMutation<Attribute, { id: number | null; data: Record<string, unknown> }>(
		async ({ id, data }) => (await wc<Attribute>(id ? `products/attributes/${id}` : 'products/attributes', { method: id ? 'PUT' : 'POST', data })).data as unknown as Attribute,
		[wooKeys.attributes]
	);

	const deleteAttribute = useWooMutation<Attribute, number>(
		async (id) => (await wc<Attribute>(`products/attributes/${id}`, { method: 'DELETE', params: { force: 'true' } })).data as unknown as Attribute,
		[wooKeys.attributes]
	);

	const openEditor = (attribute: Attribute | null = null) => {
		setNameError('');
		setForm(
			attribute
				? { id: attribute.id, name: attribute.name, slug: attribute.slug.replace(/^pa_/, ''), order_by: attribute.order_by, has_archives: attribute.has_archives }
				: EMPTY_FORM
		);
		setEditorOpen(true);
	};

	const saveAttribute = async () => {
		if (!form.name.trim()) {
			setNameError(__('The attribute name is required.'));
			return;
		}

		setNameError('');

		const data: Record<string, unknown> = { name: form.name.trim(), order_by: form.order_by, has_archives: form.has_archives };

		if (form.slug.trim()) {
			data.slug = form.slug.trim();
		}

		await saveAttributeMutation.mutateAsync({ id: form.id, data });
		notify({ title: form.id ? __('Attribute updated') : __('Attribute created'), tone: 'success' });
		setEditorOpen(false);
		refetch();
	};

	const removeAttribute = async (attribute: Attribute) => {
		const confirmed = await confirm({
			title: __('Delete attribute?'),
			message: sprintf(__('“%s” and all of its values will be removed from every product.'), attribute.name),
			confirmLabel: __('Delete'),
			variant: 'danger',
		});

		if (!confirmed) {
			return;
		}

		await deleteAttribute.mutateAsync(attribute.id);
		notify({ title: __('Attribute deleted'), tone: 'success' });
		refetch();
	};

	const openTerms = async (attribute: Attribute) => {
		setTermsSheet({ open: true, attribute, terms: [], loading: true });
		setNewTerm('');
		setEditingTerm(null);

		const all: AttributeTerm[] = [];

		for (let page = 1; page <= 20; page += 1) {
			const response = await wc<AttributeTerm>(`products/attributes/${attribute.id}/terms`, { params: { per_page: 100, page, _fields: 'id,name,slug,count' } });
			const items = response.data ?? [];
			all.push(...items);

			if (items.length < 100) {
				break;
			}
		}

		setTermsSheet({ open: true, attribute, terms: all, loading: false });
	};

	const addTerm = async () => {
		const name = newTerm.trim();

		if (!name || !termsSheet.attribute) {
			return;
		}

		const created = (await wc<AttributeTerm>(`products/attributes/${termsSheet.attribute.id}/terms`, { method: 'POST', data: { name } })).data as unknown as AttributeTerm;

		setTermsSheet((current) => ({ ...current, terms: [...current.terms, created] }));
		setNewTerm('');
	};

	const saveTerm = async (term: AttributeTerm) => {
		const name = editingTerm?.name.trim();

		if (!name || name === term.name || !termsSheet.attribute) {
			setEditingTerm(null);
			return;
		}

		const updated = (await wc<AttributeTerm>(`products/attributes/${termsSheet.attribute.id}/terms/${term.id}`, { method: 'PUT', data: { name } })).data as unknown as AttributeTerm;

		setTermsSheet((current) => ({ ...current, terms: current.terms.map((item) => (item.id === term.id ? { ...item, ...updated } : item)) }));
		setEditingTerm(null);
	};

	const removeTerm = async (term: AttributeTerm) => {
		if (!termsSheet.attribute) {
			return;
		}

		const confirmed = await confirm({
			title: __('Delete value?'),
			message: sprintf(__('“%s” will be removed from every product that uses it.'), term.name),
			confirmLabel: __('Delete'),
			variant: 'danger',
		});

		if (!confirmed) {
			return;
		}

		await wc(`products/attributes/${termsSheet.attribute.id}/terms/${term.id}`, { method: 'DELETE', params: { force: 'true' } });
		setTermsSheet((current) => ({ ...current, terms: current.terms.filter((item) => item.id !== term.id) }));
	};

	const columns: Column<Attribute>[] = [
		{ key: 'name', label: __('Name'), cell: (row) => <span className="font-medium text-gray-800 dark:text-white/90">{row.name}</span> },
		{
			key: 'slug',
			label: __('Slug'),
			cell: (row) => <code className="rounded-sm bg-gray-100 px-1.5 py-0.5 text-theme-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">{row.slug}</code>,
		},
		{ key: 'order_by', label: __('Default sort order'), cell: (row) => orderLabel(row.order_by) },
		{
			key: 'has_archives',
			label: __('Archives'),
			cell: (row) => <Icon name={row.has_archives ? 'check' : 'remove'} className={`text-theme-lg ${row.has_archives ? 'text-success-500' : 'text-gray-400'}`} />,
		},
		{
			key: 'actions',
			label: '',
			align: 'end',
			width: '56px',
			cell: (row) => (
				<DropdownMenu
					items={[
						{ label: __('Manage values'), icon: 'list', onSelect: () => openTerms(row) },
						{ label: __('Edit'), icon: 'edit', onSelect: () => openEditor(row) },
						{ separator: true },
						{ label: __('Delete'), icon: 'delete', danger: true, onSelect: () => removeAttribute(row) },
					]}
					trigger={<Button variant="ghost" size="xs" icon="more_vert" iconOnly aria-label={__('Actions')} />}
				/>
			),
		},
	];

	return (
		<div>
			<PageHeader
				title={__('Attributes')}
				description={__('Global attributes such as size or color can be reused across products and variations.')}
				breadcrumbs={[{ label: __('Products'), onClick: () => navigate('/') }, { label: __('Attributes') }]}
				actions={
					<Button icon="add" onClick={() => openEditor()}>
						{__('Add attribute')}
					</Button>
				}
			/>

			<Card padding="none">
				<DataTable
					columns={columns}
					rows={attributes}
					loading={isLoading}
					skeletonRows={4}
					clickableRows
					onRowClick={openTerms}
					emptyIcon="layers"
					emptyTitle={__('No attributes yet')}
					emptyDescription={__('Create attributes to describe and vary your products.')}
					caption={__('Attributes')}
				/>
			</Card>

			<Sheet
				open={editorOpen}
				onOpenChange={setEditorOpen}
				title={form.id ? __('Edit attribute') : __('Add attribute')}
				footer={
					<>
						<Button variant="outline" onClick={() => setEditorOpen(false)}>
							{__('Cancel')}
						</Button>
						<Button type="submit" form="fd-attribute-form" loading={saveAttributeMutation.isPending}>
							{__('Save attribute')}
						</Button>
					</>
				}
			>
				<form
					id="fd-attribute-form"
					className="space-y-5"
					onSubmit={(event) => {
						event.preventDefault();
						saveAttribute();
					}}
				>
					<Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} label={__('Name')} error={nameError} required />
					<Input
						value={form.slug}
						onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
						label={__('Slug')}
						hint={__('Unique identifier with up to 28 characters.')}
						maxLength={28}
					/>
					<Select value={form.order_by} onChange={(next) => setForm((current) => ({ ...current, order_by: next }))} options={orderOptions} label={__('Default sort order')} />
					<Checkbox
						checked={form.has_archives}
						onCheckedChange={(has_archives) => setForm((current) => ({ ...current, has_archives }))}
						label={__('Enable archives')}
						description={__('Create a page listing the products with each value.')}
					/>
				</form>
			</Sheet>

			<Sheet
				open={termsSheet.open}
				onOpenChange={(open) => setTermsSheet((current) => ({ ...current, open }))}
				title={termsSheet.attribute?.name ?? ''}
				description={__('Values available for this attribute.')}
			>
				<form
					className="mb-5 flex gap-2"
					onSubmit={(event) => {
						event.preventDefault();
						addTerm();
					}}
				>
					<Input value={newTerm} onChange={(event) => setNewTerm(event.target.value)} className="flex-1" placeholder={__('New value')} aria-label={__('New value')} />
					<Button type="submit" icon="add">
						{__('Add')}
					</Button>
				</form>

				{termsSheet.loading ? (
					<div className="space-y-2">
						{[0, 1, 2, 3, 4].map((index) => (
							<Skeleton key={index} className="h-11 w-full rounded-lg" />
						))}
					</div>
				) : !termsSheet.terms.length ? (
					<p className="text-center text-theme-sm text-gray-500 dark:text-gray-400">{__('No values yet.')}</p>
				) : (
					<ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
						{termsSheet.terms.map((term) => (
							<li key={term.id} className="flex items-center gap-2 px-4 py-2.5">
								{editingTerm?.id === term.id ? (
									<form
										className="flex flex-1 gap-2"
										onSubmit={(event) => {
											event.preventDefault();
											saveTerm(term);
										}}
									>
										<Input
											value={editingTerm.name}
											onChange={(event) => setEditingTerm({ id: term.id, name: event.target.value })}
											size="sm"
											className="flex-1"
											aria-label={__('Value name')}
										/>
										<Button type="submit" size="xs" icon="check" iconOnly aria-label={__('Save')} />
										<Button size="xs" variant="ghost" icon="close" iconOnly aria-label={__('Cancel')} onClick={() => setEditingTerm(null)} />
									</form>
								) : (
									<>
										<span className="min-w-0 flex-1 truncate text-theme-sm text-gray-800 dark:text-white/90">{term.name}</span>
										<span className="text-theme-xs text-gray-500 dark:text-gray-400">{sprintf(__('%d products'), term.count || 0)}</span>
										<Button size="xs" variant="ghost" icon="edit" iconOnly aria-label={__('Rename value')} onClick={() => setEditingTerm({ id: term.id, name: term.name })} />
										<Button size="xs" variant="ghost" icon="delete" iconOnly aria-label={__('Delete value')} onClick={() => removeTerm(term)} />
									</>
								)}
							</li>
						))}
					</ul>
				)}
			</Sheet>
		</div>
	);
};
