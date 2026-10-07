import { useMemo, useState } from 'react';
import { useQueryFilters } from '@/react/hooks/useQueryFilters';
import { cn } from '@/react/lib/cn';
import { __, sprintf } from '@/react/lib/i18n';
import { Alert, Badge, Button, Card, DataTable, Icon, Input, Modal, PageHeader, Pagination, SearchInput, Skeleton, Tabs, Textarea, type Column, type TabItem } from '@/react/ui';
import { formatSize, isReadOnly, useDropTable, useRunQuery, useTableData, useTableStructure, useTables, type DatabaseTable, type TableColumn } from '@/react/features/database/queries';

/**
 * The database explorer: the tables of the site, what is in them, and a box for running a
 * read-only query.
 */

const DEFAULTS = { table: '', tab: 'data', search: '', page: 1, per_page: 25 };

/** A cell out of the database holds anything; this is it as something a person can read. */
export const cellText = (value: unknown): string => {
	if (value === null || value === undefined) {
		return '';
	}

	return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

const ResultTable = ({ rows }: { rows: Record<string, unknown>[] }) => {
	const columns: Column<Record<string, unknown>>[] = useMemo(
		() =>
			Object.keys(rows[0] ?? {}).map((key) => ({
				key,
				label: key,
				cell: (row) => (
					<span className="block max-w-xs truncate font-mono text-theme-xs" title={cellText(row[key])}>
						{cellText(row[key]) || <span className="text-gray-400">NULL</span>}
					</span>
				),
			})),
		[rows]
	);

	return <DataTable columns={columns} rows={rows} rowKey={(_row, index) => index} emptyIcon="table_rows" emptyTitle={__('No rows')} />;
};

const DropTableModal = ({ table, open, onClose }: { table: string; open: boolean; onClose: () => void }) => {
	const drop = useDropTable();
	const [password, setPassword] = useState('');
	const [confirmation, setConfirmation] = useState('');

	const ready = password.length > 0 && confirmation === table;

	return (
		<Modal
			open={open}
			onOpenChange={(next) => (next ? undefined : onClose())}
			title={__('Delete this table?')}
			footer={
				<>
					<Button variant="outline" onClick={onClose}>
						{__('Cancel')}
					</Button>
					<Button
						variant="danger"
						loading={drop.isPending}
						disabled={!ready}
						onClick={() =>
							drop.mutate(
								{ table, password },
								{
									onSuccess: () => {
										setPassword('');
										setConfirmation('');
										onClose();
									},
								}
							)
						}
					>
						{__('Delete the table')}
					</Button>
				</>
			}
		>
			<div className="flex flex-col gap-4">
				<Alert variant="error" title={sprintf(__('%s and everything in it will be gone.'), table)}>
					{__('A table cannot be brought back. Make sure you have a backup.')}
				</Alert>

				<Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" label={sprintf(__('Type %s to confirm'), table)} />

				<Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" label={__('Your password')} hint={__('Asked again because this cannot be undone.')} />
			</div>
		</Modal>
	);
};

const QueryBox = () => {
	const run = useRunQuery();
	const [sql, setSql] = useState('SELECT * FROM wp_options LIMIT 10');

	const readOnly = isReadOnly(sql);

	return (
		<Card>
			<Textarea rows={5} value={sql} onChange={(event) => setSql(event.target.value)} className="font-mono text-theme-xs" spellCheck={false} label={__('Query')} hint={__('Only SELECT runs here, and the server caps how many rows come back.')} />

			<div className="mt-3 flex items-center gap-3">
				<Button icon="play_arrow" loading={run.isPending} disabled={!readOnly || !sql.trim()} onClick={() => run.mutate(sql)}>
					{__('Run')}
				</Button>

				{!readOnly && sql.trim() ? <span className="text-theme-xs text-error-600">{__('Only SELECT is allowed.')}</span> : null}

				{run.data ? <span className="text-theme-xs text-gray-500 dark:text-gray-400">{sprintf(__('%s row(s)'), String(run.data.rows_affected))}</span> : null}
			</div>

			{run.isError ? <Alert variant="error" title={run.error.message} className="mt-4" /> : null}

			{run.data ? (
				<div className="mt-4 overflow-x-auto">
					<ResultTable rows={run.data.data} />
				</div>
			) : null}
		</Card>
	);
};

export const DatabaseExplorer = () => {
	const { filters, setFilters } = useQueryFilters(DEFAULTS);
	const tables = useTables();
	const [tableSearch, setTableSearch] = useState('');
	const [dropOpen, setDropOpen] = useState(false);

	const table = String(filters.table);
	const tab = String(filters.tab);
	const page = Number(filters.page);
	const perPage = Number(filters.per_page);

	const structure = useTableStructure(tab === 'structure' && table ? table : null);
	const data = useTableData(tab === 'data' && table ? table : null, page, perPage);

	const shown = (tables.data ?? []).filter((item) => item.name.toLowerCase().includes(tableSearch.toLowerCase()));
	const current = tables.data?.find((item) => item.name === table);

	const tabs: TabItem[] = [
		{ value: 'data', label: __('Rows') },
		{ value: 'structure', label: __('Columns') },
		{ value: 'query', label: __('Query') },
	];

	const structureColumns: Column<TableColumn>[] = [
		{ key: 'Field', label: __('Column'), cell: (column) => <span className="font-mono text-theme-xs font-medium">{column.Field}</span> },
		{ key: 'Type', label: __('Type'), cell: (column) => <span className="font-mono text-theme-xs">{column.Type}</span> },
		{ key: 'Null', label: __('Empty allowed'), cell: (column) => <span className="text-theme-xs">{column.Null === 'YES' ? __('Yes') : __('No')}</span> },
		{
			key: 'Key',
			label: __('Key'),
			cell: (column) =>
				column.Key ? (
					<Badge variant="light" color={column.Key === 'PRI' ? 'primary' : 'light'}>
						{column.Key}
					</Badge>
				) : (
					<span className="text-gray-400">—</span>
				),
		},
		{ key: 'Default', label: __('Default'), cell: (column) => <span className="font-mono text-theme-xs">{column.Default ?? <span className="text-gray-400">NULL</span>}</span> },
	];

	return (
		<>
			<PageHeader title={__('Database')} description={sprintf(__('%s table(s)'), String(tables.data?.length ?? 0))} />

			<div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
				<Card className="flex max-h-[40rem] flex-col p-0">
					<div className="border-b border-gray-100 p-3 dark:border-gray-800">
						<SearchInput value={tableSearch} onChange={setTableSearch} placeholder={__('Search tables')} aria-label={__('Search tables')} size="sm" />
					</div>

					<div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
						{tables.isLoading ? (
							<div className="space-y-2 p-1">
								{Array.from({ length: 10 }, (_, index) => (
									<Skeleton key={index} className="h-8 w-full" />
								))}
							</div>
						) : (
							<ul className="space-y-0.5">
								{shown.map((item: DatabaseTable) => (
									<li key={item.name}>
										<button
											type="button"
											onClick={() => setFilters({ table: item.name, page: 1 })}
											className={cn(
												'flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-start text-theme-xs transition-colors',
												table === item.name ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300' : 'hover:bg-gray-50 dark:hover:bg-white/5'
											)}
										>
											<span className="truncate font-mono">{item.name}</span>
											<span className="shrink-0 text-gray-400">{item.row_count}</span>
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				</Card>

				<div className="min-w-0">
					{!table ? (
						<Card>
							<div className="py-16 text-center">
								<Icon name="storage" className="mx-auto mb-3 text-4xl text-gray-300 dark:text-gray-600" />
								<p className="text-theme-sm text-gray-500 dark:text-gray-400">{__('Choose a table to look inside it.')}</p>
							</div>
						</Card>
					) : (
						<>
							<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
								<div>
									<h2 className="font-mono text-lg font-semibold text-gray-900 dark:text-gray-100">{table}</h2>
									{current ? (
										<p className="text-theme-xs text-gray-500 dark:text-gray-400">
											{sprintf(__('%1$s rows · %2$s'), String(current.row_count), formatSize(current.size_mb))}
											{current.is_wp_table ? ` · ${__('WordPress table')}` : ''}
										</p>
									) : null}
								</div>

								<Button variant="outline" size="sm" icon="delete" className="text-error-600" onClick={() => setDropOpen(true)}>
									{__('Delete table')}
								</Button>
							</div>

							<Tabs items={tabs} value={tab} onChange={(next) => setFilters({ tab: next })} className="mb-4" />

							{tab === 'query' ? (
								<QueryBox />
							) : tab === 'structure' ? (
								<Card className="p-0">
									<DataTable columns={structureColumns} rows={structure.data ?? []} rowKey="Field" loading={structure.isLoading} emptyIcon="table_chart" emptyTitle={__('No columns')} />
								</Card>
							) : (
								<Card className="p-0">
									<div className="overflow-x-auto">
										<ResultTable rows={Array.isArray(data.data?.data) ? data.data.data : []} />
									</div>

									<div className="flex items-center justify-end border-t border-gray-100 p-4 dark:border-gray-800">
										<Pagination
											page={page}
											perPage={perPage}
											total={data.data?.pagination?.total ?? 0}
											onPageChange={(next) => setFilters({ page: next })}
											onPerPageChange={(next) => setFilters({ per_page: next, page: 1 })}
										/>
									</div>
								</Card>
							)}
						</>
					)}
				</div>
			</div>

			<DropTableModal table={table} open={dropOpen} onClose={() => setDropOpen(false)} />
		</>
	);
};
