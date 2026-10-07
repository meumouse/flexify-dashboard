import { useEffect, useId, useRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/react/lib/cn';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | 'className' | 'onChange'> & {
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	label?: string;
	description?: string;
	indeterminate?: boolean;
	/** sm (16px, tables) | md (20px) */
	size?: 'sm' | 'md';
	className?: string;
	children?: ReactNode;
};

export const Checkbox = ({
	checked,
	onCheckedChange,
	label,
	description,
	indeterminate = false,
	size = 'md',
	disabled,
	className,
	children,
	id,
	...rest
}: CheckboxProps) => {
	const generatedId = useId();
	const inputId = id ?? generatedId;
	const inputRef = useRef<HTMLInputElement>(null);
	const hasLabel = Boolean(label || description || children);

	useEffect(() => {
		if (inputRef.current) {
			inputRef.current.indeterminate = indeterminate;
		}
	}, [indeterminate]);

	return (
		<label
			htmlFor={inputId}
			className={cn('select-none items-start gap-3', disabled ? 'cursor-not-allowed' : 'cursor-pointer', hasLabel ? 'flex w-fit' : 'inline-flex', className)}
		>
			<span className="relative mt-px flex">
				<input
					{...rest}
					id={inputId}
					ref={inputRef}
					type="checkbox"
					className="peer sr-only"
					checked={checked}
					disabled={disabled}
					onChange={(event) => onCheckedChange(event.target.checked)}
				/>
				<span
					className={cn(
						'flex shrink-0 items-center justify-center border-[1.25px] transition-colors peer-focus-visible:shadow-focus-ring',
						size === 'sm' ? 'h-4 w-4 rounded-sm' : 'h-5 w-5 rounded-md',
						checked || indeterminate ? 'border-brand-500 bg-brand-500 text-white' : 'border-gray-300 bg-transparent dark:border-gray-700',
						disabled && 'opacity-50'
					)}
				>
					{indeterminate ? (
						<svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
							<path d="M2.5 6H9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
						</svg>
					) : checked ? (
						<svg className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} viewBox="0 0 14 14" fill="none" aria-hidden="true">
							<path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="1.94437" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					) : null}
				</span>
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
