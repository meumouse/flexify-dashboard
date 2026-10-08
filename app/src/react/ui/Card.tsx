import type { ReactNode } from 'react';
import { cn } from '@/react/lib/cn';
import { cardClass } from '@/react/ui/recipes';

type Props = {
	title?: string;
	description?: string;
	/** none | sm | md */
	padding?: 'none' | 'sm' | 'md';
	/** Draw a line under the header */
	divided?: boolean;
	className?: string;
	bodyClassName?: string;
	/** Rendered at the end of the header */
	actions?: ReactNode;
	/** Replaces the default header */
	header?: ReactNode;
	footer?: ReactNode;
	children?: ReactNode;
};

const paddings = {
	none: '',
	sm: 'px-4 py-4 sm:px-5',
	md: 'px-5 py-5 sm:px-6',
};

export const Card = ({ title, description, padding = 'md', divided = false, className, bodyClassName, actions, header, footer, children }: Props) => {
	const hasHeader = Boolean(title || description || header || actions);

	return (
		<div className={cn(cardClass, className)}>
			{hasHeader ? (
				<div
					className={cn(
						'flex flex-wrap items-start justify-between gap-4 px-5 pt-5 sm:px-6',
						divided && 'border-b border-gray-100 pb-4 dark:border-gray-800'
					)}
				>
					{header ?? (
						<div className="min-w-0">
							{title ? <h3 className="text-theme-md font-semibold text-gray-800 dark:text-white/90">{title}</h3> : null}
							{description ? <p className="mt-0.5 text-theme-sm text-gray-500 dark:text-gray-400">{description}</p> : null}
						</div>
					)}
					{actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
				</div>
			) : null}

			<div className={cn(paddings[padding], hasHeader && !divided && padding !== 'none' && 'pt-4 sm:pt-5', bodyClassName)}>{children}</div>

			{footer ? <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">{footer}</div> : null}
		</div>
	);
};
