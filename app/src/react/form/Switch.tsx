import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/react/lib/cn';

export type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | 'className' | 'onChange' | 'checked'> & {
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	label?: string;
	description?: string;
	size?: 'sm' | 'md';
	/** Put the label before the switch and push them apart */
	labelPosition?: 'start' | 'end';
	className?: string;
	children?: ReactNode;
};

export const Switch = ({
	checked,
	onCheckedChange,
	label,
	description,
	size = 'md',
	labelPosition = 'end',
	disabled,
	className,
	children,
	id,
	...rest
}: SwitchProps) => {
	const generatedId = useId();
	const inputId = id ?? generatedId;
	const small = size === 'sm';
	const hasLabel = Boolean(label || description || children);

	return (
		<label
			htmlFor={inputId}
			className={cn(
				'select-none items-center gap-3',
				disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
				labelPosition === 'start' && 'flex-row-reverse justify-between',
				hasLabel ? (labelPosition === 'start' ? 'flex' : 'flex w-fit') : 'inline-flex',
				className
			)}
		>
			<span className="relative flex shrink-0">
				<input
					{...rest}
					id={inputId}
					type="checkbox"
					role="switch"
					className="peer sr-only"
					checked={checked}
					disabled={disabled}
					onChange={(event) => onCheckedChange(event.target.checked)}
				/>
				<span
					className={cn(
						'block rounded-full transition-colors duration-150 ease-linear peer-focus-visible:shadow-focus-ring',
						small ? 'h-5 w-9' : 'h-6 w-11',
						checked ? 'bg-brand-500' : 'bg-gray-200 dark:bg-white/10'
					)}
				/>
				<span
					className={cn(
						'absolute top-0.5 left-0.5 rounded-full bg-white shadow-theme-sm transition-transform duration-150 ease-linear',
						small ? 'h-4 w-4' : 'h-5 w-5',
						checked && 'translate-x-full rtl:-translate-x-full'
					)}
				/>
			</span>

			{hasLabel ? (
				<span className="flex flex-col">
					<span className="text-sm font-medium text-gray-700 dark:text-gray-400">{children ?? label}</span>
					{description ? <span className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">{description}</span> : null}
				</span>
			) : null}
		</label>
	);
};
