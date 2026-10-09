import { useState, type ReactNode } from 'react';
import { useMediaQuery } from '@/react/hooks/useMediaQuery';
import { __, sprintf } from '@/react/lib/i18n';
import { Button } from '@/react/ui/Button';
import { Popover } from '@/react/ui/Popover';
import { Sheet } from '@/react/ui/Sheet';

/**
 * The "Filters" button of a list and the panel it opens.
 *
 * Filters apply as they change, like they did when they sat in a row: the list behind the panel
 * is the preview. On a phone the panel is a sheet, because a popover full of selects does not
 * fit under a button at 375px.
 */

type Props = {
	/** How many filters are on, drawn on the button */
	count: number;
	onClear?: () => void;
	children: ReactNode;
};

export const FilterPopover = ({ count, onClear, children }: Props) => {
	const [open, setOpen] = useState(false);
	const narrow = useMediaQuery('(max-width: 639px)');

	const label = count ? sprintf(__('Filters (%d)'), count) : __('Filters');
	const fields = <div className="flex flex-col gap-4">{children}</div>;
	const clear =
		onClear && count ? (
			<Button variant="ghost" size="sm" onClick={onClear}>
				{__('Clear filters')}
			</Button>
		) : null;

	const trigger = (
		<Button variant={count ? 'secondary' : 'outline'} icon="filter_alt" iconOnly={narrow} aria-label={label} aria-expanded={open} onClick={narrow ? () => setOpen(true) : undefined}>
			{narrow ? (
				count ? (
					<span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-theme-2xs font-medium text-white" aria-hidden="true">
						{count}
					</span>
				) : null
			) : (
				label
			)}
		</Button>
	);

	if (narrow) {
		return (
			<>
				{trigger}
				<Sheet
					open={open}
					onOpenChange={setOpen}
					title={__('Filters')}
					footer={
						<div className="flex w-full items-center justify-between gap-3">
							{clear ?? <span />}
							<Button onClick={() => setOpen(false)}>{__('Show results')}</Button>
						</div>
					}
				>
					{fields}
				</Sheet>
			</>
		);
	}

	return (
		<Popover open={open} onOpenChange={setOpen} align="end" className="w-80 p-4" trigger={trigger}>
			{fields}
			{clear ? <div className="mt-4 flex justify-end border-t border-gray-100 pt-3 dark:border-gray-800">{clear}</div> : null}
		</Popover>
	);
};
