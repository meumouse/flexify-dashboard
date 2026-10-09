import { useId, useMemo, useState } from 'react';
import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { Calendar } from '@/react/form/Calendar';
import { dayFormat, PickerFooter, PickerTrigger } from '@/react/form/DatePicker';
import { Field } from '@/react/form/Field';
import { firstDayOfWeek, isoDate, lastDays, lastMonth, orderRange, parseDay, sameDay, startOfDay, thisMonth, type DayRange } from '@/react/form/dates';
import { Button } from '@/react/ui/Button';
import { Popover } from '@/react/ui/Popover';
import { type FieldSize } from '@/react/ui/recipes';

/**
 * A period, chosen from a calendar: first click is one end, second click the other.
 *
 * Nothing is reported until both ends are in. A filter that ran on the first click would fetch
 * a one-day period nobody asked for, and then fetch again a second later.
 */

export type DateRangeValue = { from: string; to: string };

export type DateRangePreset = { label: string; range: () => DayRange };

/** The periods people look back over most, shared so every filter offers the same ones. */
export const recentPresets = (): DateRangePreset[] => [
	{ label: __('Last 7 days'), range: () => lastDays(7) },
	{ label: __('Last 30 days'), range: () => lastDays(30) },
	{ label: __('Last 90 days'), range: () => lastDays(90) },
	{ label: __('This month'), range: () => thisMonth() },
	{ label: __('Last month'), range: () => lastMonth() },
];

type Props = {
	/** Both ends as `YYYY-MM-DD`; both empty for no period */
	value: DateRangeValue;
	onChange: (value: DateRangeValue) => void;
	/** Shortcuts beside the calendar, such as "Last 7 days" */
	presets?: DateRangePreset[];
	label?: string;
	hint?: string;
	/** Also hides "Clear": a required period cannot be emptied */
	required?: boolean;
	placeholder?: string;
	size?: FieldSize;
	/** Latest day that can be picked, as `YYYY-MM-DD` */
	max?: string;
	align?: 'start' | 'center' | 'end';
	className?: string;
	'aria-label'?: string;
};

const rangeText = (range: DayRange): string => {
	const formatter = dayFormat as Intl.DateTimeFormat & { formatRange?: (from: Date, to: Date) => string };

	if (sameDay(range.from, range.to)) {
		return dayFormat.format(range.from);
	}

	return formatter.formatRange ? formatter.formatRange(range.from, range.to) : `${dayFormat.format(range.from)} – ${dayFormat.format(range.to)}`;
};

export const DateRangePicker = ({ value, onChange, presets = [], label, hint, required = false, placeholder, size = 'md', max, align = 'start', className, 'aria-label': ariaLabel }: Props) => {
	const triggerId = useId();
	const [open, setOpen] = useState(false);
	const [anchor, setAnchor] = useState<Date | null>(null);
	const [hovered, setHovered] = useState<Date | null>(null);
	const weekStartsOn = useMemo(() => firstDayOfWeek(), []);

	const from = parseDay(value.from);
	const to = parseDay(value.to);
	const current = from && to ? { from, to } : null;
	const maxDay = parseDay(max);

	// While the second end is being chosen, the band follows the pointer from the first one.
	const shown = anchor ? orderRange(anchor, hovered ?? anchor) : current;

	const toggle = (next: boolean) => {
		setOpen(next);
		setAnchor(null);
		setHovered(null);
	};

	const commit = (range: DayRange | null) => {
		onChange(range ? { from: isoDate(range.from), to: isoDate(range.to) } : { from: '', to: '' });
		toggle(false);
	};

	const pick = (day: Date) => {
		if (!anchor) {
			setAnchor(day);
			return;
		}

		commit(orderRange(anchor, day));
	};

	const activePreset = current ? presets.find((preset) => {
		const range = preset.range();

		return sameDay(range.from, current.from) && sameDay(range.to, current.to);
	}) : undefined;

	return (
		<Field label={label} htmlFor={triggerId} hint={hint} required={required} className={className}>
			<Popover
				open={open}
				onOpenChange={toggle}
				align={align}
				className="p-3"
				trigger={
					<PickerTrigger
						id={triggerId}
						text={current ? (activePreset?.label ?? rangeText(current)) : ''}
						placeholder={placeholder ?? __('Any date')}
						state="default"
						size={size}
						aria-label={ariaLabel}
					/>
				}
			>
				{/* Held to the calendar's width on a phone, or the presets row sets the width and runs off the screen. */}
				<div className="flex w-72 flex-col gap-3 sm:w-auto sm:flex-row">
					{presets.length ? (
						<ul className="flex flex-wrap gap-1 border-gray-100 pb-3 dark:border-gray-800 max-sm:border-b sm:w-36 sm:flex-col sm:flex-nowrap sm:border-e sm:pb-0 sm:pe-3">
							{presets.map((preset) => (
								<li key={preset.label}>
									<button
										type="button"
										onClick={() => commit(preset.range())}
										className={cn(
											'w-full rounded-lg px-3 py-2 text-start text-theme-sm font-medium transition-colors',
											preset === activePreset
												? 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400'
												: 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300'
										)}
									>
										{preset.label}
									</button>
								</li>
							))}
						</ul>
					) : null}

					<div>
						<Calendar
							initialFocus={current?.to ?? startOfDay(new Date())}
							weekStartsOn={weekStartsOn}
							range={shown}
							max={maxDay}
							onSelect={pick}
							onHover={anchor ? setHovered : undefined}
						/>

						<PickerFooter>
							<span className="text-theme-xs text-gray-500 dark:text-gray-400" aria-live="polite">
								{anchor ? __('Now pick the last day') : __('Pick the first day')}
							</span>
							{!required && current ? (
								<Button variant="ghost" size="xs" onClick={() => commit(null)}>
									{__('Clear')}
								</Button>
							) : null}
						</PickerFooter>
					</div>
				</div>
			</Popover>
		</Field>
	);
};
