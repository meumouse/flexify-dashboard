import type { ReactNode } from 'react';
import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { Icon } from '@/react/ui/Icon';

export type Breadcrumb = {
	label: string;
	href?: string;
	onClick?: () => void;
};

type Props = {
	title: ReactNode;
	description?: string;
	breadcrumbs?: Breadcrumb[];
	actions?: ReactNode;
	className?: string;
};

export const PageHeader = ({ title, description, breadcrumbs = [], actions, className }: Props) => (
	<div className={cn('mb-6 flex flex-wrap items-start justify-between gap-4', className)}>
		<div className="w-full min-w-0 sm:w-auto">
			{breadcrumbs.length ? (
				<nav className="mb-1.5" aria-label={__('Breadcrumb')}>
					<ol className="flex flex-wrap items-center gap-1.5">
						{breadcrumbs.map((crumb, index) => {
							const isLast = index === breadcrumbs.length - 1;
							const className = cn(
								'text-theme-sm',
								isLast ? 'text-gray-800 dark:text-white/90' : 'cursor-pointer text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400'
							);

							return (
								<li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
									{crumb.onClick ? (
										<button type="button" className={className} onClick={crumb.onClick}>
											{crumb.label}
										</button>
									) : crumb.href ? (
										<a href={crumb.href} className={className}>
											{crumb.label}
										</a>
									) : (
										<span className={className}>{crumb.label}</span>
									)}
									{!isLast ? <Icon name="chevron_right" className="text-theme-sm text-gray-400 rtl:rotate-180" /> : null}
								</li>
							);
						})}
					</ol>
				</nav>
			) : null}

			<h2 className="text-theme-xl font-semibold text-gray-800 dark:text-white/90">{title}</h2>
			{description ? <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">{description}</p> : null}
		</div>

		{actions ? <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">{actions}</div> : null}
	</div>
);
