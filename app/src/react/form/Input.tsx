import { forwardRef, useId, useRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { Field, fieldState } from '@/react/form/Field';
import { Icon } from '@/react/ui/Icon';
import { fieldBase, fieldSizes, fieldStates, type FieldSize } from '@/react/ui/recipes';

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'className'> & {
	label?: string;
	hint?: string;
	error?: string | boolean;
	success?: string | boolean;
	required?: boolean;
	/** Icon name shown at the start of the field */
	icon?: string;
	/** Short text shown at the start, e.g. a currency symbol */
	prefix?: string;
	/** Short text shown at the end, e.g. a unit */
	suffix?: string;
	size?: FieldSize;
	clearable?: boolean;
	onClear?: () => void;
	/** Classes for the wrapper */
	className?: string;
	inputClassName?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
	{ label, hint, error, success, required = false, icon, prefix, suffix, size = 'md', clearable = false, onClear, className, inputClassName, id, ...rest },
	ref
) {
	const generatedId = useId();
	const inputId = id ?? generatedId;
	const state = fieldState(error, success);
	const innerRef = useRef<HTMLInputElement>(null);

	const setRefs = (node: HTMLInputElement | null) => {
		innerRef.current = node;

		if (typeof ref === 'function') {
			ref(node);
		} else if (ref) {
			ref.current = node;
		}
	};

	const clear = () => {
		onClear?.();
		innerRef.current?.focus();
	};

	return (
		<Field label={label} htmlFor={inputId} hint={hint} error={error} success={success} required={required} className={className}>
			<div className="relative">
				{icon || prefix ? (
					<span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-gray-500 dark:text-gray-400">
						{icon ? <Icon name={icon} className="text-lg" /> : <span className="text-sm">{prefix}</span>}
					</span>
				) : null}

				<input
					{...rest}
					id={inputId}
					ref={setRefs}
					required={required}
					aria-invalid={state === 'error' || undefined}
					className={cn(
						fieldBase,
						fieldStates[state],
						fieldSizes[size] ?? fieldSizes.md,
						(icon || prefix) && 'ps-10',
						(suffix || clearable) && 'pe-10',
						inputClassName
					)}
				/>

				{clearable && rest.value ? (
					<button
						type="button"
						className="absolute inset-y-0 end-0 flex items-center pe-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
						aria-label={__('Clear')}
						onClick={clear}
					>
						<Icon name="close" className="text-base" />
					</button>
				) : suffix ? (
					<span className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3.5 text-sm text-gray-500 dark:text-gray-400">{suffix}</span>
				) : null}
			</div>
		</Field>
	);
});
