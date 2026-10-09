import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { Button } from '@/react/ui/Button';
import {
	addMonths,
	clampDay,
	inRange,
	isoDate,
	monthGrid,
	moveFocus,
	sameDay,
	sameMonth,
	startOfDay,
	weekdayNames,
	type DayRange,
} from '@/react/form/dates';

/**
 * One month of days, for the date pickers. Not exported from the kit: a screen asks for a
 * date through `DatePicker` or `DateRangePicker`, never for a bare grid.
 */

type Props = {
	/** The day that takes focus when the calendar opens */
	initialFocus: Date;
	weekStartsOn: number;
	selected?: Date | null;
	/** Drawn as a band; while a range is being picked this is the preview under the pointer */
	range?: DayRange | null;
	min?: Date | null;
	max?: Date | null;
	onSelect: (day: Date) => void;
	onHover?: (day: Date | null) => void;
};

const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const dayLabel = new Intl.DateTimeFormat(undefined, { dateStyle: 'full' });

export const Calendar = ({ initialFocus, weekStartsOn, selected = null, range = null, min = null, max = null, onSelect, onHover }: Props) => {
	const [focused, setFocused] = useState(() => clampDay(startOfDay(initialFocus), min, max));
	const [month, setMonth] = useState(() => new Date(focused.getFullYear(), focused.getMonth(), 1));
	const grid = useRef<HTMLDivElement>(null);
	const moved = useRef(true);

	const days = useMemo(() => monthGrid(month, weekStartsOn), [month, weekStartsOn]);
	const weekdays = useMemo(() => weekdayNames(weekStartsOn), [weekStartsOn]);
	const today = startOfDay(new Date());

	// Focus follows the keyboard into the grid, and lands on the chosen day when the calendar
	// opens. Clicking the month arrows does not set it, so the pointer keeps its place.
	useEffect(() => {
		if (moved.current) {
			moved.current = false;
			grid.current?.querySelector<HTMLButtonElement>(`[data-day="${isoDate(focused)}"]`)?.focus();
		}
	}, [focused]);

	const isDisabled = (day: Date) => Boolean((min && day < min) || (max && day > max));

	const page = (months: number) => {
		const next = clampDay(addMonths(focused, months), min, max);

		setMonth(new Date(month.getFullYear(), month.getMonth() + months, 1));
		setFocused(next);
	};

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const rtl = grid.current ? getComputedStyle(grid.current).direction === 'rtl' : false;
		const key = rtl && event.key === 'ArrowLeft' ? 'ArrowRight' : rtl && event.key === 'ArrowRight' ? 'ArrowLeft' : event.key;
		const target = moveFocus(focused, key, weekStartsOn, event.shiftKey);

		if (!target) {
			return;
		}

		event.preventDefault();

		const next = clampDay(target, min, max);

		moved.current = true;
		setFocused(next);

		if (!sameMonth(next, month)) {
			setMonth(new Date(next.getFullYear(), next.getMonth(), 1));
		}
	};

	const prevDisabled = Boolean(min && new Date(month.getFullYear(), month.getMonth(), 0) < min);
	const nextDisabled = Boolean(max && new Date(month.getFullYear(), month.getMonth() + 1, 1) > max);

	return (
		<div className="w-72 select-none">
			<div className="mb-2 flex items-center justify-between gap-2">
				<Button variant="ghost" size="xs" icon="chevron_left" iconOnly aria-label={__('Previous month')} disabled={prevDisabled} onClick={() => page(-1)} />
				<p className="text-theme-sm font-medium text-gray-800 first-letter:uppercase dark:text-white/90" aria-live="polite">
					{monthLabel.format(month)}
				</p>
				<Button variant="ghost" size="xs" icon="chevron_right" iconOnly aria-label={__('Next month')} disabled={nextDisabled} onClick={() => page(1)} />
			</div>

			<div ref={grid} role="grid" aria-label={monthLabel.format(month)} onKeyDown={onKeyDown} onMouseLeave={() => onHover?.(null)}>
				<div role="row" className="grid grid-cols-7">
					{weekdays.map((weekday) => (
						<span key={weekday.long} role="columnheader" aria-label={weekday.long} className="flex h-8 items-center justify-center text-theme-xs font-medium text-gray-400">
							{weekday.short}
						</span>
					))}
				</div>

				{Array.from({ length: 6 }, (_, week) => (
					<div key={week} role="row" className="grid grid-cols-7 gap-y-0.5">
						{days.slice(week * 7, week * 7 + 7).map((day) => {
							const disabled = isDisabled(day);
							const isSelected = sameDay(day, selected) || sameDay(day, range?.from) || sameDay(day, range?.to);
							const isBetween = !isSelected && inRange(day, range);
							const outside = !sameMonth(day, month);

							return (
								<div key={isoDate(day)} role="gridcell" aria-selected={isSelected || isBetween} className={cn(isBetween && 'bg-brand-50 dark:bg-brand-500/15')}>
									<button
										type="button"
										data-day={isoDate(day)}
										tabIndex={sameDay(day, focused) ? 0 : -1}
										disabled={disabled}
										aria-label={dayLabel.format(day)}
										aria-current={sameDay(day, today) ? 'date' : undefined}
										onClick={() => {
											setFocused(day);
											onSelect(day);
										}}
										onMouseEnter={() => onHover?.(day)}
										onFocus={() => onHover?.(day)}
										className={cn(
											'flex h-9 w-full items-center justify-center rounded-lg text-theme-sm transition-colors focus:outline-hidden focus-visible:shadow-focus-ring',
											isSelected
												? 'bg-brand-500 font-medium text-white'
												: isBetween
													? 'text-brand-600 hover:bg-brand-100 dark:text-brand-400 dark:hover:bg-brand-500/25'
													: outside
														? 'text-gray-400 hover:bg-gray-100 dark:text-gray-600 dark:hover:bg-white/5'
														: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5',
											!isSelected && sameDay(day, today) && 'font-semibold text-brand-500 dark:text-brand-400',
											disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent'
										)}
									>
										{day.getDate()}
									</button>
								</div>
							);
						})}
					</div>
				))}
			</div>
		</div>
	);
};
