import { useState } from 'react';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { __ } from '@/react/lib/i18n';
import {
	Alert,
	Avatar,
	Badge,
	Button,
	Card,
	Checkbox,
	ColorPicker,
	DataTable,
	DropdownMenu,
	EmptyState,
	Input,
	MetricCard,
	Modal,
	PageHeader,
	Pagination,
	Radio,
	SearchInput,
	Select,
	Sheet,
	Skeleton,
	StatStrip,
	Slider,
	Switch,
	Tabs,
	Textarea,
	Tooltip,
	type Column,
	type RowKey,
	type SortState,
} from '@/react/ui';
import { FoundationCheck } from '@/react/features/design-system/FoundationCheck';
import type { BadgeColor, ButtonVariant } from '@/react/ui/recipes';

/**
 * Component gallery of the React kit. Doubles as the visual check for the design system.
 */

type Order = { id: number; number: string; customer: string; status: string; total: string };

const ORDERS: Order[] = [
	{ id: 1, number: '#1200', customer: 'Ana Souza', status: 'processing', total: 'R$ 85,80' },
	{ id: 2, number: '#1199', customer: 'Bruno Lima', status: 'pending', total: 'R$ 1.323,00' },
	{ id: 3, number: '#1198', customer: 'Carla Mendes', status: 'completed', total: 'R$ 625,90' },
];

const STATUS_COLORS: Record<string, BadgeColor> = { processing: 'primary', pending: 'warning', completed: 'success' };

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
	<section className="space-y-4">
		<h2 className="text-theme-lg font-semibold text-gray-800 dark:text-white/90">{title}</h2>
		{children}
	</section>
);

export const Showcase = () => {
	const { notify } = useNotify();
	const confirm = useConfirm();

	const [tab, setTab] = useState('components');
	const [segment, setSegment] = useState('30');
	const [search, setSearch] = useState('');
	const [text, setText] = useState('Camiseta Básica');
	const [select, setSelect] = useState('');
	const [checked, setChecked] = useState(true);
	const [radio, setRadio] = useState('standard');
	const [switched, setSwitched] = useState(true);
	const [weight, setWeight] = useState(2);
	const [colour, setColour] = useState('#008aff');
	const [modalOpen, setModalOpen] = useState(false);
	const [sheetOpen, setSheetOpen] = useState(false);
	const [selected, setSelected] = useState<RowKey[]>([]);
	const [expanded, setExpanded] = useState<RowKey[]>([]);
	const [sort, setSort] = useState<SortState>({ key: 'number', direction: 'desc' });
	const [page, setPage] = useState(1);
	const [perPage, setPerPage] = useState(20);

	const columns: Column<Order>[] = [
		{ key: 'number', label: __('Order'), sortable: true, cell: (row) => <span className="font-medium text-gray-800 dark:text-white/90">{row.number}</span> },
		{
			key: 'customer',
			label: __('Customer'),
			cell: (row) => (
				<span className="flex items-center gap-3">
					<Avatar name={row.customer} size="sm" />
					{row.customer}
				</span>
			),
		},
		{ key: 'status', label: __('Status'), cell: (row) => <Badge color={STATUS_COLORS[row.status]}>{row.status}</Badge> },
		{ key: 'total', label: __('Total'), align: 'end', sortable: true },
		{
			key: 'actions',
			label: '',
			align: 'end',
			width: '56px',
			cell: () => (
				<DropdownMenu
					items={[
						{ label: __('View details'), icon: 'receipt_long' },
						{ separator: true },
						{ label: __('Move to trash'), icon: 'delete', danger: true },
					]}
					trigger={<Button variant="ghost" size="xs" icon="more_vert" iconOnly aria-label={__('Actions')} />}
				/>
			),
		},
	];

	return (
		<div className="space-y-8">
			<PageHeader
				title={__('Design System')}
				description={__('React component kit of the plugin, based on TailAdmin.')}
				breadcrumbs={[{ label: __('Flexify Dashboard') }, { label: __('Design System') }]}
				actions={
					<>
						<Button variant="outline" icon="refresh">
							{__('Refresh')}
						</Button>
						<Button icon="add" onClick={() => notify({ tone: 'success', title: __('Ready to build screens') })}>
							{__('Primary action')}
						</Button>
					</>
				}
			/>

			<Tabs
				value={tab}
				onChange={setTab}
				items={[
					{ value: 'components', label: __('Components'), count: 24 },
					{ value: 'foundation', label: __('Foundation') },
				]}
				ariaLabel={__('Design system sections')}
			/>

			{tab === 'foundation' ? (
				<FoundationCheck />
			) : (
				<>
					<Section title={__('Buttons')}>
						<Card>
							<div className="flex flex-wrap items-center gap-3">
								{(['primary', 'outline', 'secondary', 'danger', 'danger-outline', 'warning', 'success', 'ghost', 'link'] as ButtonVariant[]).map((variant) => (
									<Button key={variant} variant={variant}>
										{variant}
									</Button>
								))}
							</div>
							<div className="mt-4 flex flex-wrap items-center gap-3">
								<Button size="xs">xs</Button>
								<Button size="sm">sm</Button>
								<Button size="md">md</Button>
								<Button size="lg">lg</Button>
								<Button icon="download">{__('With icon')}</Button>
								<Button iconRight="arrow_forward">{__('Icon after')}</Button>
								<Button loading>{__('Loading')}</Button>
								<Button disabled>{__('Disabled')}</Button>
								<Tooltip text={__('Icon only button')}>
									<Button variant="outline" icon="settings" iconOnly aria-label={__('Settings')} />
								</Tooltip>
							</div>
						</Card>
					</Section>

					<Section title={__('Status and feedback')}>
						<div className="grid gap-4 lg:grid-cols-2">
							<Card title={__('Badges')}>
								<div className="flex flex-wrap gap-2">
									{(['primary', 'success', 'error', 'warning', 'info', 'orange', 'purple', 'light', 'dark'] as BadgeColor[]).map((color) => (
										<Badge key={color} color={color}>
											{color}
										</Badge>
									))}
								</div>
								<div className="mt-3 flex flex-wrap gap-2">
									<Badge color="success" variant="solid">
										{__('Solid')}
									</Badge>
									<Badge color="warning" dot pulse>
										{__('Live')}
									</Badge>
									<Badge color="info" icon="info" size="md">
										{__('With icon')}
									</Badge>
								</div>
							</Card>

							<Card title={__('Alerts')}>
								<div className="space-y-3">
									<Alert variant="success" title={__('Saved')} message={__('Your changes are live.')} />
									<Alert variant="warning" title={__('Check the stock')} message={__('Two products are running low.')} dismissible />
									<Alert
										variant="error"
										title={__('Payment failed')}
										message={__('The gateway refused the charge.')}
										actions={
											<Button size="xs" variant="danger-outline">
												{__('Try again')}
											</Button>
										}
									/>
								</div>
							</Card>
						</div>
					</Section>

					<Section title={__('Metrics')}>
						<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
							<MetricCard label={__('Customers')} value="3.782" icon="group" tone="brand" trend={11.01} />
							<MetricCard label={__('Orders')} value="5.359" icon="shopping_bag" tone="success" trend={-9.05} />
							<MetricCard label={__('Loading')} icon="payments" loading />
						</div>
						<StatStrip
							items={[
								{ key: 'pending', label: __('Pending payment'), value: '6', tone: 'warning', clickable: true },
								{ key: 'processing', label: __('Processing'), value: '12', tone: 'brand', clickable: true, active: true },
								{ key: 'hold', label: __('On hold'), value: '3', clickable: true },
								{ key: 'revenue', label: __('Net revenue'), value: 'R$ 48.210,50', hint: __('162 orders'), tone: 'success' },
							]}
							onSelect={(item) => notify({ tone: 'info', title: item.label })}
						/>
					</Section>

					<Section title={__('Form controls')}>
						<Card>
							<div className="grid gap-5 lg:grid-cols-2">
								<Input label={__('Product name')} value={text} onChange={(event) => setText(event.target.value)} required />
								<Input label={__('Price')} prefix="R$" value="59,90" readOnly hint={__('Prefix and hint')} />
								<Input label={__('With error')} value="SKU inválido" readOnly error={__('This SKU is already in use.')} />
								<Select
									label={__('Status')}
									value={select}
									onChange={(next) => setSelect(next)}
									placeholder={__('Select a status')}
									options={[
										{ value: 'publish', label: __('Published') },
										{ value: 'draft', label: __('Draft') },
									]}
								/>
								<SearchInput value={search} onChange={setSearch} placeholder={__('Search products')} />
								<Textarea label={__('Description')} rows={3} defaultValue={__('Short description of the product.')} />
								<Slider label={__('Weight')} value={weight} onChange={setWeight} min={0} max={10} valueLabel={`${weight} kg`} />
								<ColorPicker label={__('Badge colour')} value={colour} onChange={setColour} hint={__('Opens the system picker.')} />
							</div>

							<div className="mt-6 flex flex-wrap items-start gap-8">
								<div className="flex flex-col gap-3">
									<Checkbox checked={checked} onCheckedChange={setChecked} label={__('Featured product')} description={__('Shows first in the catalog.')} />
									<Checkbox checked={false} onCheckedChange={() => {}} label={__('Unchecked')} />
									<Checkbox checked={false} indeterminate onCheckedChange={() => {}} label={__('Indeterminate')} />
								</div>
								<div className="flex flex-col gap-3">
									<Radio checked={radio === 'standard'} onSelect={() => setRadio('standard')} label={__('Standard shipping')} />
									<Radio checked={radio === 'express'} onSelect={() => setRadio('express')} label={__('Express shipping')} description={__('Arrives in 1 day.')} />
								</div>
								<div className="flex flex-col gap-3">
									<Switch checked={switched} onCheckedChange={setSwitched} label={__('Track stock')} />
									<Switch checked={!switched} onCheckedChange={() => setSwitched(!switched)} size="sm" label={__('Small switch')} />
								</div>
							</div>
						</Card>
					</Section>

					<Section title={__('Overlays')}>
						<Card>
							<div className="flex flex-wrap items-center gap-3">
								<Button variant="outline" onClick={() => setModalOpen(true)}>
									{__('Open modal')}
								</Button>
								<Button variant="outline" onClick={() => setSheetOpen(true)}>
									{__('Open sheet')}
								</Button>
								<Button
									variant="outline"
									onClick={async () => {
										const confirmed = await confirm({
											title: __('Delete permanently?'),
											message: __('This action cannot be undone.'),
											confirmLabel: __('Delete'),
											variant: 'danger',
										});

										notify({ tone: confirmed ? 'error' : 'info', title: confirmed ? __('Deleted') : __('Cancelled') });
									}}
								>
									{__('Confirm dialog')}
								</Button>
								<DropdownMenu
									items={[
										{ heading: __('Export') },
										{ label: __('Download CSV'), icon: 'download' },
										{ label: __('Open in classic screen'), icon: 'open_in_new' },
										{ separator: true },
										{ label: __('Delete'), icon: 'delete', danger: true },
									]}
									trigger={
										<Button variant="outline" iconRight="expand_more">
											{__('Dropdown')}
										</Button>
									}
								/>
								<Tabs value={segment} onChange={setSegment} variant="segmented" items={[{ value: '7', label: '7 ' + __('days') }, { value: '30', label: '30 ' + __('days') }]} />
							</div>
						</Card>
					</Section>

					<Section title={__('Data table')}>
						<Card padding="none" footer={<Pagination page={page} perPage={perPage} total={123} onPageChange={setPage} onPerPageChange={setPerPage} />}>
							<DataTable
								columns={columns}
								rows={ORDERS}
								caption={__('Example orders')}
								selectable
								selected={selected}
								onSelectedChange={setSelected}
								expandable
								expanded={expanded}
								onExpandedChange={setExpanded}
								renderExpanded={(row) => <p className="text-theme-sm text-gray-500 dark:text-gray-400">{`${__('Details of')} ${row.number}`}</p>}
								sort={sort}
								onSortChange={setSort}
								clickableRows
								onRowClick={(row) => notify({ tone: 'info', title: row.number })}
								bulkActions={({ selected: keys, clear }) => (
									<>
										<Button size="xs" variant="outline" icon="download">
											{__('Export')}
										</Button>
										<Button size="xs" variant="danger-outline" icon="delete" onClick={clear}>
											{`${__('Trash')} (${keys.length})`}
										</Button>
									</>
								)}
							/>
						</Card>
					</Section>

					<Section title={__('Empty and loading states')}>
						<div className="grid gap-4 lg:grid-cols-2">
							<Card>
								<EmptyState
									icon="shopping_bag"
									title={__('No orders yet')}
									description={__('New orders will appear here as soon as customers check out.')}
									compact
								>
									<Button size="sm" icon="add">
										{__('Add order')}
									</Button>
								</EmptyState>
							</Card>
							<Card title={__('Skeletons')}>
								<div className="space-y-3">
									<Skeleton className="h-4 w-3/4" />
									<Skeleton className="h-4 w-1/2" />
									<Skeleton className="h-24 w-full" />
								</div>
							</Card>
						</div>
					</Section>

					<Modal
						open={modalOpen}
						onOpenChange={setModalOpen}
						title={__('Refund order')}
						description={__('Available to refund: R$ 85,80')}
						footer={
							<>
								<Button variant="outline" onClick={() => setModalOpen(false)}>
									{__('Cancel')}
								</Button>
								<Button variant="danger" onClick={() => setModalOpen(false)}>
									{__('Refund')}
								</Button>
							</>
						}
					>
						<div className="space-y-4">
							<Input label={__('Refund amount')} prefix="R$" defaultValue="85,80" />
							<Textarea label={__('Reason (optional)')} rows={2} />
						</div>
					</Modal>

					<Sheet open={sheetOpen} onOpenChange={setSheetOpen} title={__('Quick edit')} description={__('Camiseta Básica Algodão')} size="lg">
						<div className="space-y-4">
							<Input label={__('Name')} defaultValue="Camiseta Básica Algodão" />
							<Input label={__('SKU')} defaultValue="TSH-001" />
							<Switch checked label={__('Featured product')} onCheckedChange={() => {}} />
						</div>
					</Sheet>
				</>
			)}
		</div>
	);
};
