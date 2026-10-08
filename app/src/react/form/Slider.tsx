import * as RadixSlider from '@radix-ui/react-slider';
import { useId } from 'react';
import { cn } from '@/react/lib/cn';
import { Field } from '@/react/form/Field';

export type SliderProps = {
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
	step?: number;
	label?: string;
	hint?: string;
	disabled?: boolean;
	/** Drawn at the end of the label row, for the current value. */
	valueLabel?: string;
	className?: string;
	'aria-label'?: string;
};

/**
 * A value in a range.
 *
 * A native `<input type="range">` cannot be styled the same way across browsers — the track
 * and the thumb are separate pseudo-elements with a different name in each engine — so this
 * is a Radix slider with the design system's own track.
 */
export const Slider = ({ value, onChange, min = 0, max = 100, step = 1, label, hint, disabled = false, valueLabel, className, ...rest }: SliderProps) => {
	const id = useId();

	return (
		<Field
			label={label}
			htmlFor={id}
			hint={hint}
			className={className}
			labelSuffix={valueLabel ? <span className="font-medium text-gray-800 dark:text-white/90">{valueLabel}</span> : undefined}
		>
			<RadixSlider.Root
				id={id}
				value={[value]}
				onValueChange={([next]) => onChange(next)}
				min={min}
				max={max}
				step={step}
				disabled={disabled}
				className={cn('relative flex h-5 w-full touch-none select-none items-center', disabled && 'cursor-not-allowed opacity-50')}
			>
				<RadixSlider.Track className="relative h-1.5 w-full grow rounded-full bg-gray-200 dark:bg-gray-700">
					<RadixSlider.Range className="absolute h-full rounded-full bg-brand-500" />
				</RadixSlider.Track>
				<RadixSlider.Thumb
					{...rest}
					className="block h-4 w-4 rounded-full border-2 border-brand-500 bg-white shadow-theme-xs transition-colors focus:outline-hidden focus-visible:shadow-focus-ring disabled:cursor-not-allowed dark:bg-gray-900"
				/>
			</RadixSlider.Root>
		</Field>
	);
};
