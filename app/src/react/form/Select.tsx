import * as RadixSelect from '@radix-ui/react-select';
import { useId } from 'react';
import { cn } from '@/react/lib/cn';
import { Field, fieldState } from '@/react/form/Field';
import { Icon } from '@/react/ui/Icon';
import { usePortalTarget } from '@/react/hooks/usePortalTarget';
import { fieldBase, fieldSizes, fieldStates, dropdownItemClass, dropdownPanelClass, type FieldSize } from '@/react/ui/recipes';

export type SelectOption = {
	value: string | number;
	label: string;
	disabled?: boolean;
};

export type SelectGroup = {
	label: string;
	options: SelectOption[];
};

export type SelectProps = {
	options: Array<SelectOption | SelectGroup>;
	value?: string | number | null;
	/** Receives the chosen value. Numeric options come back as strings, as the DOM would give them. */
	onChange?: (value: string) => void;
	placeholder?: string;
	label?: string;
	hint?: string;
	error?: string | boolean;
	required?: boolean;
	disabled?: boolean;
	name?: string;
	id?: string;
	size?: FieldSize;
	className?: string;
	selectClassName?: string;
	'aria-label'?: string;
};

const isGroup = (option: SelectOption | SelectGroup): option is SelectGroup => 'options' in option;

const Option = ({ option }: { option: SelectOption }) => (
	<RadixSelect.Item value={String(option.value)} disabled={option.disabled} className={cn(dropdownItemClass, 'relative pe-8 data-[state=checked]:text-gray-800 dark:data-[state=checked]:text-white/90')}>
		<RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
		<RadixSelect.ItemIndicator className="absolute end-3">
			<Icon name="check" className="text-theme-md text-brand-500" />
		</RadixSelect.ItemIndicator>
	</RadixSelect.Item>
);

/**
 * The project's dropdown, on Radix rather than a native `<select>`.
 *
 * The trade is recorded in the standardisation plan: a native select opens the system picker,
 * which on a phone beats anything that can be built, and that is given up for a control that
 * looks the same on every platform and can be styled at all.
 */
export const Select = ({
	options,
	value,
	onChange,
	placeholder,
	label,
	hint,
	error,
	required = false,
	disabled = false,
	name,
	id,
	size = 'md',
	className,
	selectClassName,
	...rest
}: SelectProps) => {
	const generatedId = useId();
	const selectId = id ?? generatedId;
	const state = fieldState(error);
	const container = usePortalTarget();

	return (
		<Field label={label} htmlFor={selectId} hint={hint} error={error} required={required} className={className}>
			<RadixSelect.Root value={value === null || value === undefined ? undefined : String(value)} onValueChange={onChange} disabled={disabled} required={required} name={name}>
				<RadixSelect.Trigger
					id={selectId}
					aria-invalid={state === 'error' || undefined}
					className={cn(fieldBase, fieldStates[state], fieldSizes[size] ?? fieldSizes.md, 'flex items-center justify-between gap-2 text-start', selectClassName)}
					{...rest}
				>
					<RadixSelect.Value placeholder={<span className="text-gray-400 dark:text-gray-400">{placeholder}</span>} />
					<RadixSelect.Icon className="shrink-0 text-gray-500 dark:text-gray-400">
						<Icon name="expand_more" className="text-theme-lg" />
					</RadixSelect.Icon>
				</RadixSelect.Trigger>

				<RadixSelect.Portal container={container}>
					<RadixSelect.Content
						position="popper"
						sideOffset={6}
						className={cn(dropdownPanelClass, 'max-h-72 min-w-[var(--radix-select-trigger-width)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95')}
					>
						<RadixSelect.ScrollUpButton className="flex justify-center py-1 text-gray-400">
							<Icon name="expand_less" className="text-theme-md" />
						</RadixSelect.ScrollUpButton>

						<RadixSelect.Viewport>
							{options.map((option) =>
								isGroup(option) ? (
									<RadixSelect.Group key={`group-${option.label}`}>
										<RadixSelect.Label className="px-3 pb-1 pt-2 text-theme-xs font-medium uppercase tracking-wide text-gray-400">{option.label}</RadixSelect.Label>
										{option.options.map((child) => (
											<Option key={child.value} option={child} />
										))}
									</RadixSelect.Group>
								) : (
									<Option key={option.value} option={option} />
								)
							)}
						</RadixSelect.Viewport>

						<RadixSelect.ScrollDownButton className="flex justify-center py-1 text-gray-400">
							<Icon name="expand_more" className="text-theme-md" />
						</RadixSelect.ScrollDownButton>
					</RadixSelect.Content>
				</RadixSelect.Portal>
			</RadixSelect.Root>
		</Field>
	);
};
