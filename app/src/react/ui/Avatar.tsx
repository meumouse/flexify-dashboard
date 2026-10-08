import { useEffect, useState } from 'react';
import { cn } from '@/react/lib/cn';

type Props = {
	src?: string;
	alt?: string;
	/** Used to build the initials when there is no image */
	name?: string;
	size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
	status?: 'online' | 'offline' | 'busy';
	rounded?: 'full' | 'lg';
	className?: string;
};

const sizes = {
	xs: 'h-6 w-6 text-theme-2xs',
	sm: 'h-8 w-8 text-theme-xs',
	md: 'h-10 w-10 text-theme-sm',
	lg: 'h-12 w-12 text-theme-md',
	xl: 'h-14 w-14 text-theme-lg',
	'2xl': 'h-16 w-16 text-theme-xl',
};

const statusColors = {
	online: 'bg-success-500',
	offline: 'bg-error-400',
	busy: 'bg-warning-500',
};

const initialsOf = (value: string) =>
	value
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0])
		.join('')
		.toUpperCase();

export const Avatar = ({ src, alt, name, size = 'md', status, rounded = 'full', className }: Props) => {
	const [failed, setFailed] = useState(false);
	const radius = rounded === 'full' ? 'rounded-full' : 'rounded-lg';

	useEffect(() => setFailed(false), [src]);

	return (
		<span className={cn('relative inline-flex shrink-0', sizes[size] ?? sizes.md, className)}>
			{src && !failed ? (
				<img src={src} alt={alt || name || ''} className={cn('h-full w-full object-cover', radius)} loading="lazy" onError={() => setFailed(true)} />
			) : (
				<span
					className={cn('flex h-full w-full items-center justify-center bg-brand-50 font-medium text-brand-500 dark:bg-brand-500/15 dark:text-brand-400', radius)}
					aria-hidden="true"
				>
					{initialsOf(name || alt || '?')}
				</span>
			)}
			{status ? <span className={cn('absolute bottom-0 end-0 h-2.5 w-2.5 rounded-full border-[1.5px] border-white dark:border-gray-900', statusColors[status])} /> : null}
		</span>
	);
};
