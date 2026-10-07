import type { ReactNode } from 'react';
import { cn } from '@/react/lib/cn';
import { Icon } from '@/react/ui/Icon';

type Props = {
	icon?: string;
	title: string;
	description?: string;
	compact?: boolean;
	className?: string;
	/** Buttons shown below the text */
	children?: ReactNode;
};

export const EmptyState = ({ icon = 'inventory', title, description, compact = false, className, children }: Props) => (
	<div className={cn('flex flex-col items-center justify-center text-center', compact ? 'py-8' : 'py-14', className)}>
		<span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800">
			<Icon name={icon} className="text-2xl" />
		</span>
		<h4 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h4>
		{description ? <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">{description}</p> : null}
		{children ? <div className="mt-5 flex flex-wrap items-center justify-center gap-3">{children}</div> : null}
	</div>
);
