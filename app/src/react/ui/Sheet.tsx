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
	side?: 'left' | 'right';
	size?: 'sm' | 'md' | 'lg' | 'xl';
	persistent?: boolean;
	/** Render only the children, with no header, padding or footer */
	bare?: boolean;
	header?: ReactNode;
	footer?: ReactNode;
	children: ReactNode;
};

const sizes = {
	sm: 'sm:max-w-sm',
	md: 'sm:max-w-md',
	lg: 'sm:max-w-xl',
	xl: 'sm:max-w-3xl',
};

export const Sheet = ({ open, onOpenChange, title, description, side = 'right', size = 'md', persistent = false, bare = false, header, footer, children }: Props) => {
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
						'fixed inset-y-0 z-99999 flex w-full flex-col bg-white shadow-theme-xl dark:bg-gray-900',
						side === 'left' ? 'left-0 border-e border-gray-200 dark:border-gray-800' : 'right-0 border-s border-gray-200 dark:border-gray-800',
						'data-[state=open]:animate-in data-[state=open]:duration-300',
						side === 'left' ? 'data-[state=open]:slide-in-from-left' : 'data-[state=open]:slide-in-from-right',
						sizes[size]
					)}
				>
					{bare ? (
						<>
							<Dialog.Title className="sr-only">{title}</Dialog.Title>
							{children}
						</>
					) : (
						<>
							<div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
								{header ?? (
									<div className="min-w-0">
										<Dialog.Title className="truncate text-lg font-semibold text-gray-800 dark:text-white/90">{title}</Dialog.Title>
										{description ? <Dialog.Description className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</Dialog.Description> : null}
									</div>
								)}
								<Dialog.Close
									className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-white"
									aria-label={__('Close')}
								>
									<Icon name="close" className="text-xl" />
								</Dialog.Close>
							</div>

							<div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 custom-scrollbar sm:px-6">{children}</div>

							{footer ? (
								<div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">{footer}</div>
							) : null}
						</>
					)}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
