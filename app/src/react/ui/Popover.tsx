import * as RadixPopover from '@radix-ui/react-popover';
import type { ReactNode } from 'react';
import { cn } from '@/react/lib/cn';
import { usePortalTarget } from '@/react/hooks/usePortalTarget';
import { dropdownPanelClass } from '@/react/ui/recipes';

/**
 * Small floating panel for content that does not fit a menu, such as color swatches.
 */

type Props = {
	trigger: ReactNode;
	children: ReactNode;
	align?: 'start' | 'center' | 'end';
	side?: 'top' | 'right' | 'bottom' | 'left';
	className?: string;
};

export const Popover = ({ trigger, children, align = 'start', side = 'bottom', className }: Props) => {
	const container = usePortalTarget();

	return (
		<RadixPopover.Root>
			<RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
			<RadixPopover.Portal container={container}>
				<RadixPopover.Content
					align={align}
					side={side}
					sideOffset={6}
					className={cn(dropdownPanelClass, 'w-auto p-0 data-[state=open]:animate-in data-[state=open]:fade-in-0', className)}
				>
					{children}
				</RadixPopover.Content>
			</RadixPopover.Portal>
		</RadixPopover.Root>
	);
};
