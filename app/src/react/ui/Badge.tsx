import type { ReactNode } from 'react';
import { cn } from '@/react/lib/cn';
import { Icon } from '@/react/ui/Icon';
import { badgeColors, type BadgeColor } from '@/react/ui/recipes';

type Props = {
	color?: BadgeColor;
	variant?: 'light' | 'solid';
	size?: 'sm' | 'md';
	icon?: string;
	/** Status dot before the label */
	dot?: boolean;
	/** Animate the status dot */
	pulse?: boolean;
	className?: string;
	children?: ReactNode;
};

export const Badge = ({ color = 'primary', variant = 'light', size = 'sm', icon, dot = false, pulse = false, className, children }: Props) => {
	const palette = badgeColors[color] ?? badgeColors.primary;

	return (
		<span
			className={cn(
				'inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 font-medium',
				size === 'md' ? 'text-sm' : 'text-theme-xs',
				palette[variant] ?? palette.light,
				className
			)}
		>
			{dot ? (
				<span className="relative flex h-1.5 w-1.5">
					{pulse ? <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', variant === 'solid' ? 'bg-white' : palette.dot)} /> : null}
					<span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', variant === 'solid' ? 'bg-white' : palette.dot)} />
				</span>
			) : icon ? (
				<Icon name={icon} className="text-sm" />
			) : null}
			{children}
		</span>
	);
};
