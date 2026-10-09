import { cn } from '@/react/lib/cn';

export const Spinner = ({ className }: { className?: string }) => (
	<svg className={cn('animate-spin', className ?? 'h-5 w-5')} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" role="status" aria-hidden="true">
		<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
		<path
			className="opacity-75"
			fill="currentColor"
			d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
		/>
	</svg>
);

export const Skeleton = ({ className }: { className?: string }) => (
	<div className={cn('animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800', className)} aria-hidden="true" />
);

/**
 * What a screen looks like before it arrives: a header and a card of rows.
 *
 * A lone spinner in the middle says only "wait"; this says where things will be, so nothing
 * jumps when they get there.
 */
export const PageSkeleton = () => (
	<div aria-busy="true" aria-live="polite">
		<div className="mb-6 space-y-2">
			<Skeleton className="h-7 w-48" />
			<Skeleton className="h-4 w-72 max-w-full" />
		</div>
		<div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
			<Skeleton className="h-10 w-full max-w-sm" />
			{[0, 1, 2, 3, 4].map((row) => (
				<Skeleton key={row} className="h-12 w-full" />
			))}
		</div>
	</div>
);
