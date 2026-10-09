import { forwardRef, useId, useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { Calendar } from '@/react/form/Calendar';
import { Field, fieldState } from '@/react/form/Field';
import { firstDayOfWeek, isoDate, parseDay, startOfDay } from '@/react/form/dates';
import { Button } from '@/react/ui/Button';
import { Icon } from '@/react/ui/Icon';
import { Popover } from '@/react/ui/Popover';
import { fieldBase, fieldSizes, fieldStates, type FieldSize, type FieldState } from '@/react/ui/recipes';

/**
 * A day, chosen from a calendar.
 *
 * The browser's own date input draws a different calendar in every browser, ignores dark mode
 * and the accent colour, and in Safari is a row of spin fields. The value is still the
 * `YYYY-MM-DD` string the native input spoke, so screens and routes did not change.
 */

export const dayFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

type TriggerProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> & {
	text: string;
	placeholder: string;
	state: FieldState;
	size: FieldSize;
};

/** The closed picker: a button drawn as a field, so it lines up with the inputs around it. */
export const PickerTrigger = forwardRef<HTMLButtonElement, TriggerProps>(function PickerTrigger({ text, placeholder, state, size, ...rest }, ref) {
	return (
		<button
			{...rest}
			ref={ref}
			type="button"
			className={cn(fieldBase, fieldStates[state], fieldSizes[size] ?? fieldSizes.md, 'flex items-center gap-2 whitespace-nowrap text-start')}
		>
			<Icon name="calendar_today" className="shrink-0 text-theme-md text-gray-500 dark:text-gray-400" />
			<span className={cn('truncate', !text && 'text-gray-400 dark:text-white/30')}>{text || placeholder}</span>
		</button>
	);
});

/** Buttons under the calendar. */
export const PickerFooter = ({ children }: { children: ReactNode }) => (
	<div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">{children}</div>
);

type Props = {
	/** `YYYY-MM-DD`, or empty for no date */
	value: string;
	onChange: (value: string) => void;
	label?: string;
	hint?: string;
	error?: string | boolean;
	/** Also hides "Clear": a required date cannot be emptied */
	required?: boolean;
	placeholder?: string;
	size?: FieldSize;
	/** Earliest and latest days that can be picked, as `YYYY-MM-DD` */
	min?: string;
	max?: string;
	disabled?: boolean;
	id?: string;
	className?: string;
	'aria-label'?: string;
};

export const DatePicker = ({ value, onChange, label, hint, error, required = false, placeholder, size = 'md', min, max, disabled, id, className, 'aria-label': ariaLabel }: Props) => {
	const generatedId = useId();
	const triggerId = id ?? generatedId;
	const [open, setOpen] = useState(false);
	const weekStartsOn = useMemo(() => firstDayOfWeek(), []);

	const selected = parseDay(value);
	const minDay = parseDay(min);
	const maxDay = parseDay(max);
	const today = startOfDay(new Date());
	const todayAllowed = !(minDay && today < minDay) && !(maxDay && today > maxDay);

	const choose = (next: string) => {
		onChange(next);
		setOpen(false);
	};

	return (
		<Field label={label} htmlFor={triggerId} hint={hint} error={error} required={required} className={className}>
			<Popover
				open={open}
				onOpenChange={setOpen}
				className="p-3"
				trigger={
					<PickerTrigger
						id={triggerId}
						text={selected ? dayFormat.format(selected) : ''}
						placeholder={placeholder ?? __('Pick a date')}
						state={fieldState(error)}
						size={size}
						disabled={disabled}
						aria-label={ariaLabel}
						aria-invalid={Boolean(error) || undefined}
					/>
				}
			>
				<Calendar initialFocus={selected ?? today} weekStartsOn={weekStartsOn} selected={selected} min={minDay} max={maxDay} onSelect={(day) => choose(isoDate(day))} />

				<PickerFooter>
					<Button variant="ghost" size="xs" disabled={!todayAllowed} onClick={() => choose(isoDate(today))}>
						{__('Today')}
					</Button>
					{!required && value ? (
						<Button variant="ghost" size="xs" onClick={() => choose('')}>
							{__('Clear')}
						</Button>
					) : null}
				</PickerFooter>
			</Popover>
		</Field>
	);
};
