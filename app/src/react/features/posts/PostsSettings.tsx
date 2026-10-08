import { usePageData } from '@/react/app/WpDataProvider';
import { decodeHtml, stripTags } from '@/react/lib/html';
import { __ } from '@/react/lib/i18n';
import { Button, Icon, Input, Popover, Select, Switch } from '@/react/ui';
import { EntityPicker, termItem } from '@/react/data/EntityPicker';
import type { PostColumn, PostsQuery } from '@/react/features/posts/types';

/**
 * The settings panel: what the table shows, how much of it, and in what order.
 */

type Props = {
	query: PostsQuery;
	onChange: (patch: Partial<PostsQuery>) => void;
	columns: PostColumn[];
	onToggleColumn: (key: string) => void;
	onMoveColumn: (key: string, direction: -1 | 1) => void;
	expandAll: boolean;
	onExpandAll: (value: boolean) => void;
	hierarchical: boolean;
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
	<div className="grid grid-cols-3 items-center gap-3">
		<span className="text-theme-sm text-gray-500 dark:text-gray-400">{label}</span>
		<div className="col-span-2">{children}</div>
	</div>
);

/** A column label can be markup — an icon for comments, for instance; the key reads better then. */
const columnLabel = (column: PostColumn) => (column.label.includes('<') ? column.key : decodeHtml(stripTags(column.label)));

export const PostsSettings = ({ query, onChange, columns, onToggleColumn, onMoveColumn, expandAll, onExpandAll, hierarchical }: Props) => {
	const supportsCategories = usePageData<boolean>('supportsCategories', false);

	const orderByOptions = columns
		.filter((column) => column.sort_key)
		.map((column) => ({ value: String(column.sort_key), label: columnLabel(column) }));

	return (
		<Popover
			align="end"
			className="w-96"
			trigger={<Button variant="outline" size="sm" icon="settings">{__('Settings')}</Button>}
		>
			<div className="flex max-h-[32rem] flex-col gap-5 overflow-y-auto p-4">
				<section className="flex flex-col gap-3">
					<h3 className="text-theme-sm font-semibold text-gray-900 dark:text-gray-100">{__('Filters')}</h3>

					{supportsCategories ? (
						<Row label={__('Categories')}>
							<EntityPicker
								endpoint="wp/v2/categories"
								toItem={termItem}
								value={query.categories}
								onChange={(categories) => onChange({ categories, page: 1 })}
								placeholder={__('Any category')}
							/>
						</Row>
					) : null}

					<Row label={__('From')}>
						<Input type="date" size="sm" value={query.start_date} onChange={(event) => onChange({ start_date: event.target.value, page: 1 })} />
					</Row>
					<Row label={__('To')}>
						<Input type="date" size="sm" value={query.end_date} onChange={(event) => onChange({ end_date: event.target.value, page: 1 })} />
					</Row>
				</section>

				<section className="flex flex-col gap-3">
					<h3 className="text-theme-sm font-semibold text-gray-900 dark:text-gray-100">{__('Table settings')}</h3>

					<Row label={__('Per page')}>
						<Input
							type="number"
							size="sm"
							min={1}
							max={100}
							value={String(query.per_page)}
							onChange={(event) => onChange({ per_page: Math.min(100, Math.max(1, Number(event.target.value) || 1)), page: 1 })}
						/>
					</Row>

					<Row label={__('Order by')}>
						<Select size="sm" value={query.orderby} options={orderByOptions} onChange={(event) => onChange({ orderby: event.target.value, page: 1 })} />
					</Row>

					<Row label={__('Order')}>
						<Select
							size="sm"
							value={query.order}
							options={[
								{ value: 'ASC', label: __('Ascending') },
								{ value: 'DESC', label: __('Descending') },
							]}
							onChange={(event) => onChange({ order: event.target.value as 'ASC' | 'DESC', page: 1 })}
						/>
					</Row>

					{hierarchical ? (
						<Row label={__('Expand all')}>
							<Switch checked={expandAll} onCheckedChange={onExpandAll} label={__('Show child items')} />
						</Row>
					) : null}
				</section>

				<section className="flex flex-col gap-2">
					<h3 className="text-theme-sm font-semibold text-gray-900 dark:text-gray-100">{__('Columns')}</h3>

					<ul className="flex flex-col gap-1">
						{columns.map((column, index) => (
							<li key={column.key} className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => onToggleColumn(column.key)}
									className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-start text-theme-sm transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
									aria-pressed={column.active}
								>
									<Icon name={column.active ? 'check_box' : 'check_box_outline_blank'} className={column.active ? 'text-theme-md text-brand-500' : 'text-theme-md text-gray-400'} />
									<span className={column.active ? 'truncate text-gray-700 dark:text-gray-300' : 'truncate text-gray-400 dark:text-gray-500'}>{columnLabel(column)}</span>
								</button>

								<Button
									variant="ghost"
									size="xs"
									iconOnly
									icon="expand_less"
									disabled={index === 0}
									onClick={() => onMoveColumn(column.key, -1)}
									aria-label={__('Move up')}
								/>
								<Button
									variant="ghost"
									size="xs"
									iconOnly
									icon="expand_more"
									disabled={index === columns.length - 1}
									onClick={() => onMoveColumn(column.key, 1)}
									aria-label={__('Move down')}
								/>
							</li>
						))}
					</ul>
				</section>
			</div>
		</Popover>
	);
};
