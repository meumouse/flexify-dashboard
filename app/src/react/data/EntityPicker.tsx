import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRest } from '@/react/app/WpDataProvider';
import { cn } from '@/react/lib/cn';
import { decodeHtml } from '@/react/lib/html';
import { __ } from '@/react/lib/i18n';
import { Checkbox } from '@/react/form/Checkbox';
import { SearchInput } from '@/react/form/SearchInput';
import { Button } from '@/react/ui/Button';
import { Icon } from '@/react/ui/Icon';
import { Popover } from '@/react/ui/Popover';
import { Spinner } from '@/react/ui/Spinner';

/**
 * Pick one or more things that live behind a REST collection — categories, tags, authors.
 *
 * The site decides what is there, so the list is searched on the server rather than filtered
 * in the browser: a blog with eight hundred categories would otherwise never show the one
 * being looked for.
 */

export type PickerItem = { id: number; label: string; description?: string };

type Props = {
	endpoint: string;
	/** Turn one REST record into something to show */
	toItem: (record: Record<string, unknown>) => PickerItem;
	value: number[];
	onChange: (value: number[]) => void;
	multiple?: boolean;
	placeholder: string;
	searchPlaceholder?: string;
	/** Extra query arguments, e.g. a taxonomy or a role */
	params?: Record<string, unknown>;
	className?: string;
	disabled?: boolean;
	/** Replaces the default button, for cells that open the list from the value itself */
	trigger?: ReactNode;
	/** The chosen items, when the caller already has them and the endpoint cannot be asked by id */
	chosen?: PickerItem[];
};

export const EntityPicker = ({ endpoint, toItem, value, onChange, multiple = true, placeholder, searchPlaceholder, params = {}, className, disabled, trigger, chosen: given }: Props) => {
	const rest = useRest();
	const [search, setSearch] = useState('');

	const { data: items = [], isLoading } = useQuery({
		queryKey: ['picker', endpoint, params, search],
		staleTime: 60_000,
		queryFn: async ({ signal }) => {
			const result = await rest.list<Record<string, unknown>>(endpoint, { per_page: 50, search, ...params }, signal);

			return (result.data ?? []).map(toItem);
		},
	});

	// A chosen item can sit outside the current page of results, so the chosen ones are
	// asked for by id and kept apart from what the search returns.
	const { data: fetched = [] } = useQuery({
		queryKey: ['picker-selected', endpoint, value],
		enabled: value.length > 0 && !given,
		staleTime: 60_000,
		queryFn: async ({ signal }) => {
			const result = await rest.list<Record<string, unknown>>(endpoint, { include: value, per_page: value.length, ...params }, signal);

			return (result.data ?? []).map(toItem);
		},
	});

	const chosen = given ?? fetched;

	const toggle = (id: number) => {
		if (!multiple) {
			onChange([id]);
			return;
		}

		onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
	};

	const label = chosen.length ? chosen.map((item) => decodeHtml(item.label)).join(', ') : placeholder;

	return (
		<Popover
			className="w-72"
			trigger={
				trigger ?? (
					<Button variant="outline" size="sm" disabled={disabled} aria-label={placeholder} className={cn('w-full justify-between font-normal', className)}>
						<span className={cn('truncate', !chosen.length && 'text-gray-400 dark:text-gray-500')}>{label}</span>
						<Icon name="expand_more" className="shrink-0 text-theme-md" />
					</Button>
				)
			}
		>
			<div className="flex flex-col gap-2 p-3">
				<SearchInput value={search} onChange={setSearch} size="sm" placeholder={searchPlaceholder ?? __('Search')} aria-label={searchPlaceholder ?? __('Search')} />

				{value.length > 0 && multiple ? (
					<button type="button" onClick={() => onChange([])} className="self-start text-theme-xs font-medium text-brand-500 hover:text-brand-600">
						{__('Clear selection')}
					</button>
				) : null}

				<div className="max-h-64 overflow-y-auto">
					{isLoading ? (
						<div className="flex justify-center py-6">
							<Spinner className="h-5 w-5 text-brand-500" />
						</div>
					) : !items.length ? (
						<p className="py-6 text-center text-theme-xs text-gray-500 dark:text-gray-400">{__('Nothing found.')}</p>
					) : (
						<ul className="space-y-0.5">
							{items.map((item) => (
								<li key={item.id}>
									<button
										type="button"
										onClick={() => toggle(item.id)}
										className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-theme-sm transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
									>
										{multiple ? <Checkbox size="sm" checked={value.includes(item.id)} onCheckedChange={() => toggle(item.id)} tabIndex={-1} aria-hidden /> : null}
										<span className="min-w-0 flex-1 truncate text-gray-700 dark:text-gray-300">{decodeHtml(item.label)}</span>
										{!multiple && value.includes(item.id) ? <Icon name="check" className="text-theme-md text-brand-500" /> : null}
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</Popover>
	);
};

export const termItem = (record: Record<string, unknown>): PickerItem => ({ id: Number(record.id), label: String((record.name as string) ?? '') });

export const userItem = (record: Record<string, unknown>): PickerItem => ({
	id: Number(record.id),
	label: String((record.name as string) ?? ''),
	description: String((record.slug as string) ?? ''),
});
