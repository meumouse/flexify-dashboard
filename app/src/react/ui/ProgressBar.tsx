import { cn } from '@/react/lib/cn';

/**
 * How far along something is: an upload, a quota, a share of the total.
 */

type Tone = 'brand' | 'success' | 'warning' | 'error';

type Props = {
	/** Between 0 and `max` */
	value: number;
	max?: number;
	tone?: Tone;
	size?: 'sm' | 'md';
	/** Draws the percentage after the bar */
	showValue?: boolean;
	/** What is being measured, for screen readers when there is no visible label next to it */
	label?: string;
	className?: string;
};

const tones: Record<Tone, string> = {
	brand: 'bg-brand-500',
	success: 'bg-success-500',
	warning: 'bg-warning-500',
	error: 'bg-error-500',
};

const sizes = {
	sm: 'h-1.5',
	md: 'h-2',
};

export const ProgressBar = ({ value, max = 100, tone = 'brand', size = 'md', showValue = false, label, className }: Props) => {
	const percent = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;

	return (
		<div className={cn('flex items-center gap-3', className)}>
			<div
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={percent}
				aria-label={label}
				className={cn('w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800', sizes[size])}
			>
				<div className={cn('h-full rounded-full transition-[width] duration-300', tones[tone])} style={{ width: `${percent}%` }} />
			</div>
			{showValue ? <span className="shrink-0 text-theme-xs font-medium text-gray-700 dark:text-gray-400">{percent}%</span> : null}
		</div>
	);
};
