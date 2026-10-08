import { useId } from 'react';
import { cn } from '@/react/lib/cn';
import { Field, fieldState } from '@/react/form/Field';
import { fieldStates } from '@/react/ui/recipes';

export type ColorPickerProps = {
	value: string;
	onChange: (value: string) => void;
	label?: string;
	hint?: string;
	error?: string | boolean;
	disabled?: boolean;
	className?: string;
	'aria-label'?: string;
};

/**
 * A colour swatch that opens the system colour picker.
 *
 * The native control is kept rather than rebuilt: the operating system's picker carries an
 * eyedropper, the recent colours and the palette the person already uses. What this adds is
 * the frame, so it sits in a form next to the other fields instead of looking like a stray
 * browser widget.
 */
export const ColorPicker = ({ value, onChange, label, hint, error, disabled = false, className, ...rest }: ColorPickerProps) => {
	const id = useId();

	return (
		<Field label={label} htmlFor={id} hint={hint} error={error} className={className}>
			<input
				{...rest}
				id={id}
				type="color"
				value={value}
				disabled={disabled}
				onChange={(event) => onChange(event.target.value)}
				className={cn(
					'h-11 w-14 cursor-pointer rounded-lg border bg-transparent p-1 shadow-theme-xs transition-colors focus:outline-hidden focus:ring-3 disabled:cursor-not-allowed disabled:opacity-50',
					fieldStates[fieldState(error)]
				)}
			/>
		</Field>
	);
};
