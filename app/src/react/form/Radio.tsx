import { useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/react/lib/cn';

export type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className' | 'onChange' | 'checked'> & {
	checked: boolean;
	onSelect: () => void;
	label?: string;
	description?: string;
	className?: string;
};

export const Radio = ({ checked, onSelect, label, description, disabled, className, id, ...rest }: RadioProps) => {
	const generatedId = useId();
	const inputId = id ?? generatedId;

	return (
		<label
			htmlFor={inputId}
			className={cn('flex w-fit select-none items-start gap-3', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer', className)}
		>
			<span className="relative mt-px flex">
				<input {...rest} id={inputId} type="radio" className="peer sr-only" checked={checked} disabled={disabled} onChange={onSelect} />
				<span
					className={cn(
						'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.25px] transition-colors peer-focus-visible:shadow-focus-ring',
						checked ? 'border-brand-500 bg-brand-500' : 'border-gray-300 bg-transparent dark:border-gray-700'
					)}
				>
					{checked ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
				</span>
			</span>

			{label || description ? (
				<span className="flex flex-col">
					<span className="text-sm font-medium text-gray-700 dark:text-gray-400">{label}</span>
					{description ? <span className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">{description}</span> : null}
				</span>
			) : null}
		</label>
	);
};
