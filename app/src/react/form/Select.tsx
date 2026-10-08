import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { cn } from '@/react/lib/cn';
import { Field, fieldState } from '@/react/form/Field';
import { Icon } from '@/react/ui/Icon';
import { fieldBase, fieldSizes, fieldStates, type FieldSize } from '@/react/ui/recipes';

export type SelectOption = {
	value: string | number;
	label: string;
	disabled?: boolean;
};

export type SelectGroup = {
	label: string;
	options: SelectOption[];
};

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'className'> & {
	options: Array<SelectOption | SelectGroup>;
	placeholder?: string;
	label?: string;
	hint?: string;
	error?: string | boolean;
	required?: boolean;
	size?: FieldSize;
	className?: string;
	selectClassName?: string;
};

const isGroup = (option: SelectOption | SelectGroup): option is SelectGroup => 'options' in option;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
	{ options, placeholder, label, hint, error, required = false, size = 'md', className, selectClassName, id, value, ...rest },
	ref
) {
	const generatedId = useId();
	const selectId = id ?? generatedId;
	const state = fieldState(error);
	const hasValue = value !== '' && value !== null && value !== undefined;

	return (
		<Field label={label} htmlFor={selectId} hint={hint} error={error} required={required} className={className}>
			<div className="relative">
				<select
					{...rest}
					id={selectId}
					ref={ref}
					value={value}
					required={required}
					aria-invalid={state === 'error' || undefined}
					className={cn(
						fieldBase,
						fieldStates[state],
						fieldSizes[size] ?? fieldSizes.md,
						'appearance-none bg-none pe-11',
						!hasValue && placeholder && 'text-gray-400 dark:text-gray-400',
						selectClassName
					)}
				>
					{placeholder ? (
						<option value="" className="text-gray-700 dark:bg-gray-900 dark:text-gray-400">
							{placeholder}
						</option>
					) : null}

					{options.map((option) =>
						isGroup(option) ? (
							<optgroup key={`group-${option.label}`} label={option.label}>
								{option.options.map((child) => (
									<option key={child.value} value={child.value} disabled={child.disabled} className="text-gray-700 dark:bg-gray-900 dark:text-gray-400">
										{child.label}
									</option>
								))}
							</optgroup>
						) : (
							<option key={option.value} value={option.value} disabled={option.disabled} className="text-gray-700 dark:bg-gray-900 dark:text-gray-400">
								{option.label}
							</option>
						)
					)}
				</select>
				<span className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3.5 text-gray-500 dark:text-gray-400">
					<Icon name="expand_more" className="text-theme-lg" />
				</span>
			</div>
		</Field>
	);
});
