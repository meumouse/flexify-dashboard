import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/react/lib/cn';
import { Icon } from '@/react/ui/Icon';

export type TabItem<T extends string | number = string> = {
	value: T;
	label: string;
	count?: number | null;
	icon?: string;
	disabled?: boolean;
};

type Props<T extends string | number> = {
	value: T;
	items: TabItem<T>[];
	onChange: (value: T) => void;
	variant?: 'underline' | 'segmented';
	ariaLabel?: string;
	className?: string;
};

export const Tabs = <T extends string | number>({ value, items, onChange, variant = 'underline', ariaLabel, className }: Props<T>) => {
	const listRef = useRef<HTMLDivElement>(null);

	const select = (item: TabItem<T>) => {
		if (item.disabled || item.value === value) {
			return;
		}

		onChange(item.value);
	};

	const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
		if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
			return;
		}

		event.preventDefault();

		const enabled = items.filter((item) => !item.disabled);
		const current = enabled.findIndex((item) => item.value === items[index].value);
		const next = enabled[(current + (event.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length];

		if (!next) {
			return;
		}

		select(next);
		listRef.current?.querySelector<HTMLButtonElement>(`[data-value="${CSS.escape(String(next.value))}"]`)?.focus();
	};

	return (
		<div
			ref={listRef}
			role="tablist"
			aria-label={ariaLabel}
			className={cn(
				variant === 'segmented'
					? 'inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-gray-100 p-0.5 no-scrollbar dark:bg-gray-900'
					: 'flex max-w-full items-center gap-2 overflow-x-auto border-b border-gray-200 no-scrollbar dark:border-gray-800',
				className
			)}
		>
			{items.map((item, index) => {
				const selected = item.value === value;

				return (
					<button
						key={String(item.value)}
						type="button"
						role="tab"
						data-value={String(item.value)}
						aria-selected={selected}
						tabIndex={selected ? 0 : -1}
						disabled={item.disabled}
						onClick={() => select(item)}
						onKeyDown={(event) => onKeyDown(event, index)}
						className={cn(
							'inline-flex shrink-0 items-center gap-2 whitespace-nowrap font-medium transition-colors focus:outline-hidden focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:opacity-50',
							variant === 'segmented'
								? cn(
										'rounded-lg px-3 py-2 text-theme-sm',
										selected ? 'bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
									)
								: cn(
										'-mb-px border-b-2 px-2.5 py-3 text-theme-sm',
										selected
											? 'border-brand-500 text-brand-500 dark:border-brand-400 dark:text-brand-400'
											: 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
									)
						)}
					>
						{item.icon ? <Icon name={item.icon} className="text-theme-md" /> : null}
						<span>{item.label}</span>
						{item.count !== undefined && item.count !== null ? (
							<span
								className={cn(
									'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-theme-xs font-medium',
									selected ? 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400' : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400'
								)}
							>
								{item.count}
							</span>
						) : null}
					</button>
				);
			})}
		</div>
	);
};
