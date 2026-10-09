import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { Icon } from '@/react/ui/Icon';
import { usePortalTarget } from '@/react/hooks/usePortalTarget';
import { alertColors, type AlertVariant } from '@/react/ui/recipes';

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title?: string;
	description?: string;
	size?: 'sm' | 'md' | 'lg' | 'xl';
	/** Block closing on escape and outside clicks */
	persistent?: boolean;
	hideClose?: boolean;
	/** Alert layout: the tone's icon in a circle above a centred title, for a question or a result */
	tone?: AlertVariant;
	bodyClassName?: string;
	footer?: ReactNode;
	children: ReactNode;
};

const sizes = {
	sm: 'max-w-md',
	md: 'max-w-lg',
	lg: 'max-w-2xl',
	xl: 'max-w-4xl',
};

const toneCircles: Record<AlertVariant, string> = {
	success: 'bg-success-50 dark:bg-success-500/15',
	error: 'bg-error-50 dark:bg-error-500/15',
	warning: 'bg-warning-50 dark:bg-warning-500/15',
	info: 'bg-blue-light-50 dark:bg-blue-light-500/15',
};

export const Modal = ({ open, onOpenChange, title, description, size = 'md', persistent = false, hideClose = false, tone, bodyClassName, footer, children }: Props) => {
	const container = usePortalTarget();
	const block = (event: Event) => {
		if (persistent) {
			event.preventDefault();
		}
	};

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal container={container}>
			{/*
				Only the way in is animated: Radix keeps a closed node mounted until its exit
				animation reports back, and when that does not happen the invisible overlay stays
				on top of the page and swallows every click.
			*/}
				<Dialog.Overlay className="fixed inset-0 z-99999 bg-gray-900/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
				<Dialog.Content
					onEscapeKeyDown={block}
					onPointerDownOutside={block}
					onInteractOutside={block}
					className={cn(
						'fixed left-1/2 top-1/2 z-99999 flex max-h-[90vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-white shadow-theme-xl dark:bg-gray-900',
						sizes[size]
					)}
				>
					{title || !hideClose ? (
						<div className={cn('flex items-start justify-between gap-4 px-6 pb-2 pt-6 lg:px-8 lg:pt-8', tone && 'relative justify-center text-center')}>
							<div className={cn('min-w-0', tone && 'flex flex-col items-center')}>
								{tone ? (
									<span className={cn('mb-4 flex h-14 w-14 items-center justify-center rounded-full', toneCircles[tone])}>
										<Icon name={alertColors[tone].iconName} className={cn('text-title-xs', alertColors[tone].icon)} />
									</span>
								) : null}
								{title ? <Dialog.Title className="text-theme-lg font-semibold text-gray-800 dark:text-white/90">{title}</Dialog.Title> : null}
								{description ? <Dialog.Description className="mt-0.5 text-theme-sm text-gray-500 dark:text-gray-400">{description}</Dialog.Description> : null}
							</div>
							{!hideClose ? (
								<Dialog.Close
									className={cn(
										'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-white',
										tone && 'absolute end-4 top-4'
									)}
									aria-label={__('Close')}
								>
									<Icon name="close" className="text-theme-xl" />
								</Dialog.Close>
							) : null}
						</div>
					) : null}

					<div className={cn('min-h-0 flex-1 overflow-y-auto px-6 py-4 custom-scrollbar lg:px-8', !title && 'pt-6 lg:pt-8', !footer && 'pb-6 lg:pb-8', tone && 'text-center', bodyClassName)}>
						{children}
					</div>

					{footer ? (
						<div className={cn('flex flex-wrap items-center gap-3 px-6 lg:px-8', tone ? 'justify-center pb-6 pt-2 lg:pb-8' : 'justify-end border-t border-gray-100 py-4 dark:border-gray-800')}>
							{footer}
						</div>
					) : null}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
