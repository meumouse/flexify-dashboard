import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { AppProviders } from '@/react/app/AppProviders';
import { PageShell } from '@/react/app/PageShell';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { acceptsFile } from '@/react/form/Dropzone';
import { isoDate, lastDays } from '@/react/form/dates';
import {
	Button,
	Checkbox,
	DataTable,
	DatePicker,
	DateRangePicker,
	DropdownMenu,
	Dropzone,
	Modal,
	Pagination,
	ProgressBar,
	SearchInput,
	Switch,
	TableCard,
	Tabs,
	pageList,
	recentPresets,
	type Column,
	type RowKey,
	type SortState,
} from '@/react/ui';
import type { WpData } from '@/react/types/wordpress';

const wpData: WpData = {
	pluginBase: 'https://site.test/plugin/',
	restBase: 'https://site.test/wp-json/',
	restNonce: '',
	adminUrl: '',
	loginUrl: '',
	siteUrl: '',
	userId: 1,
	userName: 'Maria',
	userEmail: '',
	userRoles: [],
	canManageOptions: true,
	currentUser: null,
	settings: {},
	page: {},
};

const renderKit = (ui: ReactNode) =>
	render(
		<AppProviders wpData={wpData}>
			<PageShell>{ui}</PageShell>
		</AppProviders>
	);

describe('Button', () => {
	it('renders a link when href is set', () => {
		renderKit(<Button href="https://site.test">{'Ver loja'}</Button>);

		expect(screen.getByRole('link', { name: 'Ver loja' })).toHaveAttribute('href', 'https://site.test');
	});

	it('blocks clicks while loading', async () => {
		const onClick = vi.fn();
		renderKit(
			<Button loading onClick={onClick}>
				{'Salvar'}
			</Button>
		);

		const button = screen.getByRole('button', { name: 'Salvar' });
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute('aria-busy', 'true');

		await userEvent.click(button).catch(() => undefined);
		expect(onClick).not.toHaveBeenCalled();
	});
});

describe('Checkbox and Switch', () => {
	it('exposes the accessible name and reports changes', async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		renderKit(<Checkbox checked={false} onCheckedChange={onChange} aria-label="Selecionar linha" />);

		const checkbox = screen.getByRole('checkbox', { name: 'Selecionar linha' });
		await user.click(checkbox);

		expect(onChange).toHaveBeenCalledWith(true);
	});

	it('marks the indeterminate state on the input', () => {
		renderKit(<Checkbox checked={false} indeterminate onCheckedChange={() => {}} aria-label="Selecionar todos" />);

		expect(screen.getByRole('checkbox', { name: 'Selecionar todos' })).toBePartiallyChecked();
	});

	it('renders the switch with the right role', async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		renderKit(<Switch checked={false} onCheckedChange={onChange} label="Rastrear estoque" />);

		await user.click(screen.getByRole('switch', { name: 'Rastrear estoque' }));
		expect(onChange).toHaveBeenCalledWith(true);
	});
});

describe('Tabs', () => {
	it('moves between tabs with the arrow keys', async () => {
		const user = userEvent.setup();

		const Wrapper = () => {
			const [value, setValue] = useState('all');

			return (
				<Tabs
					value={value}
					onChange={setValue}
					ariaLabel="Status"
					items={[
						{ value: 'all', label: 'Todos' },
						{ value: 'pending', label: 'Pendentes', count: 3 },
					]}
				/>
			);
		};

		renderKit(<Wrapper />);

		const first = screen.getByRole('tab', { name: 'Todos' });
		first.focus();
		await user.keyboard('{ArrowRight}');

		expect(screen.getByRole('tab', { name: /Pendentes/ })).toHaveAttribute('aria-selected', 'true');
	});
});

describe('Pagination', () => {
	it('builds a compact page list', () => {
		expect(pageList(1, 5)).toEqual([1, 2, 3, 4, 5]);
		expect(pageList(10, 20)).toEqual([1, 'start-gap', 9, 10, 11, 'end-gap', 20]);
	});

	it('disables the previous button on the first page', async () => {
		const user = userEvent.setup();
		const onPageChange = vi.fn();
		renderKit(<Pagination page={1} perPage={20} total={100} onPageChange={onPageChange} />);

		expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();

		await user.click(screen.getByRole('button', { name: 'Next page' }));
		expect(onPageChange).toHaveBeenCalledWith(2);
	});
});

describe('SearchInput', () => {
	it('reports the typed value after the debounce', async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();

		renderKit(<SearchInput value="" onChange={onChange} placeholder="Buscar pedidos" debounce={50} />);

		await user.type(screen.getByRole('searchbox', { name: 'Buscar pedidos' }), 'ana');

		await waitFor(() => expect(onChange).toHaveBeenCalledWith('ana'));
		// Only the last keystroke is reported.
		expect(onChange).toHaveBeenCalledTimes(1);
	});
});

describe('DropdownMenu', () => {
	it('opens from the keyboard and runs the selected item', async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn();

		renderKit(
			<DropdownMenu
				items={[
					{ label: 'Exportar CSV', icon: 'download', onSelect },
					{ separator: true },
					{ label: 'Excluir', danger: true },
				]}
				trigger={<Button>{'Ações'}</Button>}
			/>
		);

		screen.getByRole('button', { name: 'Ações' }).focus();
		await user.keyboard('{Enter}');

		const item = await screen.findByRole('menuitem', { name: 'Exportar CSV' });
		await user.click(item);

		expect(onSelect).toHaveBeenCalled();
	});
});

describe('Modal and confirm dialog', () => {
	it('renders inside the kit portal and closes', async () => {
		const user = userEvent.setup();

		const Wrapper = () => {
			const [open, setOpen] = useState(true);

			return (
				<Modal open={open} onOpenChange={setOpen} title="Reembolsar pedido">
					<p>{'Conteúdo'}</p>
				</Modal>
			);
		};

		const { container } = renderKit(<Wrapper />);

		const dialog = await screen.findByRole('dialog', { name: 'Reembolsar pedido' });
		expect(container.querySelector('#fd-kit-portal')?.contains(dialog)).toBe(true);

		await user.click(within(dialog).getByRole('button', { name: 'Close' }));
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	});

	it('resolves the confirmation with the chosen answer', async () => {
		const user = userEvent.setup();
		const results: boolean[] = [];

		const Wrapper = () => {
			const confirm = useConfirm();

			return (
				<Button
					onClick={async () => {
						results.push(await confirm({ title: 'Excluir permanentemente?', confirmLabel: 'Excluir', variant: 'danger' }));
					}}
				>
					{'Excluir'}
				</Button>
			);
		};

		renderKit(<Wrapper />);

		await user.click(screen.getByRole('button', { name: 'Excluir' }));

		const dialog = await screen.findByRole('dialog', { name: 'Excluir permanentemente?' });
		await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));

		await waitFor(() => expect(results).toEqual([true]));
	});
});

type Order = { id: number; number: string; total: string };

const ORDERS: Order[] = [
	{ id: 1, number: '#1200', total: 'R$ 85,80' },
	{ id: 2, number: '#1199', total: 'R$ 120,00' },
];

describe('DataTable', () => {
	const columns: Column<Order>[] = [
		{ key: 'number', label: 'Pedido', sortable: true },
		{ key: 'total', label: 'Total', align: 'end' },
	];

	it('shows the empty state and the loading skeleton', () => {
		const { rerender } = renderKit(<DataTable columns={columns} rows={[]} emptyTitle="Nenhum pedido" />);
		expect(screen.getByText('Nenhum pedido')).toBeInTheDocument();

		rerender(
			<AppProviders wpData={wpData}>
				<PageShell>
					<DataTable columns={columns} rows={[]} loading skeletonRows={2} />
				</PageShell>
			</AppProviders>
		);

		expect(screen.queryByText('Nenhum pedido')).not.toBeInTheDocument();
	});

	it('selects every row on the page and shows the bulk bar', async () => {
		const user = userEvent.setup();

		const Wrapper = () => {
			const [selected, setSelected] = useState<RowKey[]>([]);

			return (
				<DataTable
					columns={columns}
					rows={ORDERS}
					selectable
					selected={selected}
					onSelectedChange={setSelected}
					bulkActions={({ selected: keys }) => <span>{`${keys.length} para excluir`}</span>}
				/>
			);
		};

		renderKit(<Wrapper />);

		await user.click(screen.getByRole('checkbox', { name: 'Select all' }));

		expect(await screen.findByText('2 para excluir')).toBeInTheDocument();
		expect(screen.getAllByRole('checkbox', { name: 'Select row' })[0]).toBeChecked();

		await user.click(screen.getByRole('button', { name: 'Clear selection' }));
		await waitFor(() => expect(screen.queryByText('2 para excluir')).not.toBeInTheDocument());
	});

	it('toggles the sort direction and exposes aria-sort', async () => {
		const user = userEvent.setup();

		const Wrapper = () => {
			const [sort, setSort] = useState<SortState>({ key: 'number', direction: 'asc' });

			return <DataTable columns={columns} rows={ORDERS} sort={sort} onSortChange={setSort} />;
		};

		renderKit(<Wrapper />);

		const header = screen.getByRole('columnheader', { name: /Pedido/ });
		expect(header).toHaveAttribute('aria-sort', 'ascending');

		await user.click(within(header).getByRole('button'));
		expect(header).toHaveAttribute('aria-sort', 'descending');
	});

	it('expands a row and ignores clicks on controls', async () => {
		const user = userEvent.setup();
		const onRowClick = vi.fn();

		const Wrapper = () => {
			const [expanded, setExpanded] = useState<RowKey[]>([]);

			return (
				<DataTable
					columns={columns}
					rows={ORDERS}
					expandable
					expanded={expanded}
					onExpandedChange={setExpanded}
					renderExpanded={(row) => <span>{`Detalhes ${row.number}`}</span>}
					clickableRows
					onRowClick={onRowClick}
				/>
			);
		};

		renderKit(<Wrapper />);

		await user.click(screen.getAllByRole('button', { name: 'Toggle details' })[0]);
		expect(await screen.findByText('Detalhes #1200')).toBeInTheDocument();
		expect(onRowClick).not.toHaveBeenCalled();

		await user.click(screen.getByText('R$ 85,80'));
		expect(onRowClick).toHaveBeenCalledWith(ORDERS[0], 0);
	});
});

const dayButton = (iso: string) => document.querySelector<HTMLButtonElement>(`[data-day="${iso}"]`)!;

describe('DatePicker', () => {
	it('opens on the chosen day and reports the clicked one as YYYY-MM-DD', async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		renderKit(<DatePicker value="2026-10-07" onChange={onChange} label="Validade" />);

		await user.click(screen.getByLabelText('Validade'));
		await waitFor(() => expect(dayButton('2026-10-07')).toHaveFocus());

		await user.click(dayButton('2026-10-20'));
		expect(onChange).toHaveBeenCalledWith('2026-10-20');
	});

	it('moves through the days with the keyboard', async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		renderKit(<DatePicker value="2026-10-31" onChange={onChange} label="Validade" />);

		await user.click(screen.getByLabelText('Validade'));
		await waitFor(() => expect(dayButton('2026-10-31')).toHaveFocus());

		// The next day is in another month: the grid follows it.
		await user.keyboard('{ArrowRight}');
		await waitFor(() => expect(dayButton('2026-11-01')).toHaveFocus());

		await user.keyboard('{Enter}');
		expect(onChange).toHaveBeenCalledWith('2026-11-01');
	});

	it('does not offer days outside the bounds', async () => {
		const user = userEvent.setup();
		renderKit(<DatePicker value="2026-10-10" onChange={() => {}} label="Fim" min="2026-10-05" />);

		await user.click(screen.getByLabelText('Fim'));

		await waitFor(() => expect(dayButton('2026-10-04')).toBeDisabled());
		expect(dayButton('2026-10-05')).toBeEnabled();
	});

	it('clears an optional date', async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		renderKit(<DatePicker value="2026-10-07" onChange={onChange} label="Validade" />);

		await user.click(screen.getByLabelText('Validade'));
		await user.click(await screen.findByRole('button', { name: 'Clear' }));

		expect(onChange).toHaveBeenCalledWith('');
	});
});

describe('DateRangePicker', () => {
	it('reports the period once, in order, after the second click', async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		renderKit(<DateRangePicker value={{ from: '2026-10-01', to: '2026-10-07' }} onChange={onChange} aria-label="Período" />);

		await user.click(screen.getByRole('button', { name: 'Período' }));
		await waitFor(() => expect(dayButton('2026-10-07')).toBeInTheDocument());

		await user.click(dayButton('2026-10-09'));
		expect(onChange).not.toHaveBeenCalled();

		await user.click(dayButton('2026-10-02'));
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith({ from: '2026-10-02', to: '2026-10-09' });
	});

	it('applies a preset in one click', async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		renderKit(<DateRangePicker value={{ from: '', to: '' }} onChange={onChange} presets={recentPresets()} aria-label="Período" />);

		await user.click(screen.getByRole('button', { name: 'Período' }));
		await user.click(await screen.findByRole('button', { name: 'Last 7 days' }));

		const week = lastDays(7);
		expect(onChange).toHaveBeenCalledWith({ from: isoDate(week.from), to: isoDate(week.to) });
	});
});

describe('Dropzone', () => {
	it('matches files by extension, by type and by type family', () => {
		expect(acceptsFile({ name: 'Users.CSV', type: 'application/vnd.ms-excel' }, '.csv,text/csv')).toBe(true);
		expect(acceptsFile({ name: 'export', type: 'text/csv' }, '.csv,text/csv')).toBe(true);
		expect(acceptsFile({ name: 'photo.png', type: 'image/png' }, 'image/*')).toBe(true);
		expect(acceptsFile({ name: 'photo.png', type: 'image/png' }, '.csv')).toBe(false);
		expect(acceptsFile({ name: 'anything.bin', type: '' })).toBe(true);
	});

	it('takes a dropped file and refuses one of the wrong type', () => {
		const onFile = vi.fn();
		renderKit(<Dropzone accept=".csv" onFile={onFile} title="Escolha um CSV" />);

		const zone = screen.getByRole('button', { name: /Escolha um CSV/ });
		const csv = new File(['a,b'], 'users.csv', { type: 'text/csv' });
		const png = new File([''], 'photo.png', { type: 'image/png' });

		fireEvent.drop(zone, { dataTransfer: { files: [png] } });
		expect(onFile).not.toHaveBeenCalled();
		expect(screen.getByText('That type of file is not accepted here.')).toBeInTheDocument();

		fireEvent.drop(zone, { dataTransfer: { files: [csv] } });
		expect(onFile).toHaveBeenCalledWith(csv);
	});
});

describe('ProgressBar', () => {
	it('reports the share of the maximum, held between 0 and 100', () => {
		renderKit(
			<>
				<ProgressBar value={3} max={4} label="Envio" showValue />
				<ProgressBar value={9} max={4} label="Cota" />
				<ProgressBar value={1} max={0} label="Vazio" />
			</>
		);

		expect(screen.getByRole('progressbar', { name: 'Envio' })).toHaveAttribute('aria-valuenow', '75');
		expect(screen.getByText('75%')).toBeInTheDocument();
		expect(screen.getByRole('progressbar', { name: 'Cota' })).toHaveAttribute('aria-valuenow', '100');
		expect(screen.getByRole('progressbar', { name: 'Vazio' })).toHaveAttribute('aria-valuenow', '0');
	});
});

describe('Toast action', () => {
	it('runs the action and closes the toast', async () => {
		const user = userEvent.setup();
		const undo = vi.fn();

		const Trigger = () => {
			const { notify } = useNotify();

			return (
				<button type="button" onClick={() => notify({ title: 'Movido para a lixeira', action: { label: 'Desfazer', onClick: undo } })}>
					{'Excluir'}
				</button>
			);
		};

		renderKit(<Trigger />);

		await user.click(screen.getByRole('button', { name: 'Excluir' }));
		await user.click(await screen.findByRole('button', { name: 'Desfazer' }));

		expect(undo).toHaveBeenCalledTimes(1);
		await waitFor(() => expect(screen.queryByText('Movido para a lixeira')).not.toBeInTheDocument());
	});
});

describe('TableCard', () => {
	it('counts the filters in effect and removes them from their chips', async () => {
		const user = userEvent.setup();
		const removeRole = vi.fn();
		const clear = vi.fn();

		renderKit(
			<TableCard
				search={<SearchInput value="" onChange={() => {}} aria-label="Buscar" />}
				filters={<span>{'Campos do filtro'}</span>}
				activeFilters={[
					{ key: 'role', label: 'Papel: Cliente', onRemove: removeRole },
					{ key: 'date', label: 'Últimos 7 dias', onRemove: () => {} },
				]}
				onClearFilters={clear}
			>
				<p>{'Linhas'}</p>
			</TableCard>
		);

		await user.click(screen.getByRole('button', { name: 'Remove filter: Papel: Cliente' }));
		expect(removeRole).toHaveBeenCalledTimes(1);

		await user.click(screen.getByRole('button', { name: 'Clear all' }));
		expect(clear).toHaveBeenCalledTimes(1);

		await user.click(screen.getByRole('button', { name: 'Filters (2)' }));
		expect(await screen.findByText('Campos do filtro')).toBeInTheDocument();
	});

	it('leaves the filter button out when the list has no filters', () => {
		renderKit(
			<TableCard search={<SearchInput value="" onChange={() => {}} aria-label="Buscar" />}>
				<p>{'Linhas'}</p>
			</TableCard>
		);

		expect(screen.queryByRole('button', { name: /^Filters/ })).not.toBeInTheDocument();
	});
});
