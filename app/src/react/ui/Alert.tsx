import { useState, type ReactNode } from 'react';
import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { Icon } from '@/react/ui/Icon';
import { alertColors, type AlertVariant } from '@/react/ui/recipes';

type Props = {
	variant?: AlertVariant;
	title?: string;
	message?: string;
	dismissible?: boolean;
	className?: string;
	/** Replaces the message */
	children?: ReactNode;
	/** Buttons shown under the message */
	actions?: ReactNode;
};

export const Alert = ({ variant = 'info', title, message, dismissible = false, className, children, actions }: Props) => {
	const [visible, setVisible] = useState(true);
	const palette = alertColors[variant] ?? alertColors.info;

	if (!visible) {
		return null;
	}

	return (
		<div className={cn('rounded-xl border p-4', palette.box, className)} role="alert">
			<div className="flex items-start gap-3">
				<Icon name={palette.iconName} className={cn('mt-0.5 shrink-0 text-xl', palette.icon)} />
				<div className="min-w-0 flex-1">
					{title ? <h4 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">{title}</h4> : null}
					{children ?? (message ? <p className={cn('text-theme-sm text-gray-600 dark:text-gray-300', title && 'mt-1')}>{message}</p> : null)}
					{actions ? <div className="mt-3 flex flex-wrap gap-3">{actions}</div> : null}
				</div>
				{dismissible ? (
					<button
						type="button"
						className="shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-white/60 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white"
						aria-label={__('Dismiss')}
						onClick={() => setVisible(false)}
					>
						<Icon name="close" className="text-base" />
					</button>
				) : null}
			</div>
		</div>
	);
};
