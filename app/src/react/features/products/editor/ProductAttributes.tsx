import { useEffect, useState } from 'react';
import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { Button, Checkbox, EmptyState, Icon, Input, Select } from '@/react/ui';
import { useWoo } from '@/react/woo/WooProvider';
import type { Attribute, AttributeTerm } from '@/react/woo/types';

/**
 * Attributes of a product, in the `wc/v3` shape.
 *
 * Global attributes pick their values from the terms of the taxonomy; custom ones take a
 * free list typed by the user.
 */

export type ProductAttribute = {
	id: number;
	name: string;
	position: number;
	visible: boolean;
	variation: boolean;
	options: string[];
};

type Props = {
	attributes: ProductAttribute[];
	onChange: (attributes: ProductAttribute[]) => void;
	isVariable?: boolean;
};

const splitValues = (value: string): string[] =>
	String(value || '')
		.split(/[|,]/)
		.map((item) => item.trim())
		.filter(Boolean);

export const ProductAttributes = ({ attributes, onChange, isVariable = false }: Props) => {
	const { wc } = useWoo();

	const [globalAttributes, setGlobalAttributes] = useState<Attribute[]>([]);
	const [terms, setTerms] = useState<Record<number, AttributeTerm[]>>({});
	const [newTerm, setNewTerm] = useState<Record<number, string>>({});
	const [customValues, setCustomValues] = useState<Record<number, string>>({});
	const [selectedToAdd, setSelectedToAdd] = useState('');

	const loadTerms = async (attributeId: number) => {
		if (!attributeId) {
			return;
		}

		const all: AttributeTerm[] = [];

		for (let page = 1; page <= 10; page += 1) {
			const response = await wc<AttributeTerm>(`products/attributes/${attributeId}/terms`, { params: { per_page: 100, page, _fields: 'id,name,slug' } });
			const items = response.data ?? [];
			all.push(...items);

			if (items.length < 100) {
				break;
			}
		}

		setTerms((current) => ({ ...current, [attributeId]: all }));
	};

	useEffect(() => {
		wc<Attribute>('products/attributes', { params: { _fields: 'id,name,slug' } }).then((response) => setGlobalAttributes(response.data ?? []));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Load the values of every global attribute already on the product.
	useEffect(() => {
		attributes
			.filter((attribute) => attribute.id && !terms[attribute.id])
			.forEach((attribute) => loadTerms(attribute.id));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [attributes.map((attribute) => attribute.id).join(',')]);

	const availableOptions = [
		...globalAttributes
			.filter((attribute) => !attributes.some((item) => item.id === attribute.id))
			.map((attribute) => ({ value: String(attribute.id), label: attribute.name })),
		{ value: 'custom', label: __('Custom attribute') },
	];

	const update = (index: number, patch: Partial<ProductAttribute>) => onChange(attributes.map((attribute, itemIndex) => (itemIndex === index ? { ...attribute, ...patch } : attribute)));

	const addAttribute = () => {
		if (!selectedToAdd) {
			return;
		}

		const position = attributes.length;

		if (selectedToAdd === 'custom') {
			onChange([...attributes, { id: 0, name: '', position, visible: true, variation: isVariable, options: [] }]);
		} else {
			const global = globalAttributes.find((attribute) => String(attribute.id) === selectedToAdd);

			if (global) {
				onChange([...attributes, { id: global.id, name: global.name, position, visible: true, variation: isVariable, options: [] }]);
				loadTerms(global.id);
			}
		}

		setSelectedToAdd('');
	};

	const removeAttribute = (index: number) =>
		onChange(attributes.filter((_, itemIndex) => itemIndex !== index).map((attribute, position) => ({ ...attribute, position })));

	const toggleTerm = (index: number, name: string) => {
		const options = attributes[index].options ?? [];

		update(index, { options: options.includes(name) ? options.filter((option) => option !== name) : [...options, name] });
	};

	const createTerm = async (index: number, attributeId: number) => {
		const name = String(newTerm[attributeId] || '').trim();

		if (!name) {
			return;
		}

		const created = (await wc<AttributeTerm>(`products/attributes/${attributeId}/terms`, { method: 'POST', data: { name } })).data as unknown as AttributeTerm;

		if (!created) {
			return;
		}

		setTerms((current) => ({ ...current, [attributeId]: [...(current[attributeId] ?? []), created] }));
		setNewTerm((current) => ({ ...current, [attributeId]: '' }));
		toggleTerm(index, created.name);
	};

	const commitCustomValues = (index: number) => {
		const values = splitValues(customValues[index] ?? '');

		if (!values.length) {
			return;
		}

		update(index, { options: [...new Set([...(attributes[index].options ?? []), ...values])] });
		setCustomValues((current) => ({ ...current, [index]: '' }));
	};

	return (
		<div className="space-y-4">
			{!attributes.length ? (
				<EmptyState
					compact
					icon="layers"
					title={__('No attributes yet')}
					description={isVariable ? __('Add attributes such as size or color to create variations.') : __('Attributes show extra information such as material or size.')}
				/>
			) : null}

			{attributes.map((attribute, index) => (
				<div key={`${attribute.id}-${index}`} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
					<div className="flex items-start gap-3">
						<div className="min-w-0 flex-1">
							{attribute.id ? (
								<p className="flex items-center gap-2 font-medium text-gray-800 dark:text-white/90">
									{attribute.name}
									<span className="rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs font-normal text-gray-500 dark:bg-gray-800 dark:text-gray-400">{__('Global')}</span>
								</p>
							) : (
								<Input
									value={attribute.name}
									onChange={(event) => update(index, { name: event.target.value })}
									size="sm"
									placeholder={__('Attribute name, e.g. Material')}
									aria-label={__('Attribute name')}
								/>
							)}
						</div>
						<Button variant="ghost" size="xs" icon="delete" iconOnly aria-label={__('Remove attribute')} onClick={() => removeAttribute(index)} />
					</div>

					{attribute.id ? (
						<div className="mt-3">
							<div className="flex flex-wrap gap-2">
								{(terms[attribute.id] ?? []).map((term) => {
									const active = attribute.options.includes(term.name);

									return (
										<button
											key={term.id}
											type="button"
											className={cn(
												'rounded-full border px-3 py-1 text-theme-sm transition-colors focus-visible:shadow-focus-ring focus-visible:outline-hidden',
												active
													? 'border-brand-500 bg-brand-50 text-brand-600 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-400'
													: 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600'
											)}
											aria-pressed={active}
											onClick={() => toggleTerm(index, term.name)}
										>
											{term.name}
										</button>
									);
								})}
								{!(terms[attribute.id] ?? []).length ? <span className="text-theme-sm text-gray-500 dark:text-gray-400">{__('This attribute has no values yet.')}</span> : null}
							</div>
							<div className="mt-3 flex flex-wrap items-center gap-2">
								<Input
									value={newTerm[attribute.id] ?? ''}
									onChange={(event) => setNewTerm((current) => ({ ...current, [attribute.id]: event.target.value }))}
									onKeyDown={(event) => {
										if (event.key === 'Enter') {
											event.preventDefault();
											createTerm(index, attribute.id);
										}
									}}
									size="sm"
									className="w-48"
									placeholder={__('New value')}
									aria-label={__('New value')}
								/>
								<Button size="xs" variant="outline" icon="add" onClick={() => createTerm(index, attribute.id)}>
									{__('Add value')}
								</Button>
								{(terms[attribute.id] ?? []).length ? (
									<Button size="xs" variant="link" onClick={() => update(index, { options: (terms[attribute.id] ?? []).map((term) => term.name) })}>
										{__('Select all')}
									</Button>
								) : null}
							</div>
						</div>
					) : (
						<div className="mt-3">
							{attribute.options.length ? (
								<div className="mb-3 flex flex-wrap gap-2">
									{attribute.options.map((option) => (
										<span key={option} className="inline-flex items-center gap-1 rounded-full bg-gray-100 py-1 ps-3 pe-1.5 text-theme-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
											{option}
											<button
												type="button"
												className="rounded-full p-0.5 text-gray-400 hover:text-error-500"
												aria-label={__('Remove value')}
												onClick={() => update(index, { options: attribute.options.filter((item) => item !== option) })}
											>
												<Icon name="close" className="text-sm" />
											</button>
										</span>
									))}
								</div>
							) : null}
							<Input
								value={customValues[index] ?? ''}
								onChange={(event) => setCustomValues((current) => ({ ...current, [index]: event.target.value }))}
								onKeyDown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault();
										commitCustomValues(index);
									}
								}}
								onBlur={() => commitCustomValues(index)}
								size="sm"
								placeholder={__('Type values separated by commas and press Enter')}
								aria-label={__('Attribute values')}
							/>
						</div>
					)}

					<div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
						<Checkbox checked={attribute.visible} onCheckedChange={(visible) => update(index, { visible })} size="sm" label={__('Visible on the product page')} />
						{isVariable ? (
							<Checkbox checked={attribute.variation} onCheckedChange={(variation) => update(index, { variation })} size="sm" label={__('Used for variations')} />
						) : null}
					</div>
				</div>
			))}

			<div className="flex flex-wrap items-center gap-2">
				<Select value={selectedToAdd} onChange={(event) => setSelectedToAdd(event.target.value)} options={availableOptions} placeholder={__('Add attribute…')} size="sm" className="w-60" />
				<Button size="sm" variant="outline" icon="add" disabled={!selectedToAdd} onClick={addAttribute}>
					{__('Add')}
				</Button>
			</div>
		</div>
	);
};
