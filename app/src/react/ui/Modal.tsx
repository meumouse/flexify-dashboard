import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { cn } from '@/react/lib/cn';
import { __ } from '@/react/lib/i18n';
import { Icon } from '@/react/ui/Icon';
import { usePortalTarget } from '@/react/hooks/usePortalTarget';

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title?: string;
	description?: string;
	size?: 'sm' | 'md' | 'lg' | 'xl';
	/** Block closing on escape and outside clicks */
	persistent?: boolean;
	hideClose?: boolean;
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

export const Modal = ({ open, onOpenChange, title, description, size = 'md', persistent = false, hideClose = false, bodyClassName, footer, children }: Props) => {
	const container = usePortalTarget();
	const block = (event: Event) => {
		if (persistent) {
			event.preventDefault();
		}
	};

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal container={container}>
				<Dialog.Overlay className="fixed inset-0 z-99999 bg-gray-900/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
				<Dialog.Content
					onEscapeKeyDown={block}
					onPointerDownOutside={block}
					onInteractOutside={block}
					className={cn(
						'fixed left-1/2 top-1/2 z-99999 flex max-h-[90vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-3xl bg-white shadow-theme-xl dark:bg-gray-900',
						sizes[size]
					)}
				>
					{title || !hideClose ? (
						<div className="flex items-start justify-between gap-4 px-6 pb-2 pt-6 lg:px-8 lg:pt-8">
							<div className="min-w-0">
								{title ? <Dialog.Title className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</Dialog.Title> : null}
								{description ? <Dialog.Description className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</Dialog.Description> : null}
							</div>
							{!hideClose ? (
								<Dialog.Close
									className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-white"
									aria-label={__('Close')}
								>
									<Icon name="close" className="text-xl" />
								</Dialog.Close>
							) : null}
						</div>
					) : null}

					<div className={cn('min-h-0 flex-1 overflow-y-auto px-6 py-4 custom-scrollbar lg:px-8', !title && 'pt-6 lg:pt-8', !footer && 'pb-6 lg:pb-8', bodyClassName)}>
						{children}
					</div>

					{footer ? <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800 lg:px-8">{footer}</div> : null}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
