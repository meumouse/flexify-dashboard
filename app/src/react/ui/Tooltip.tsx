import * as RadixTooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';
import { usePortalTarget } from '@/react/hooks/usePortalTarget';

type Props = {
	text: string;
	children: ReactNode;
	side?: 'top' | 'right' | 'bottom' | 'left';
	delay?: number;
};

export const TooltipProvider = RadixTooltip.Provider;

export const Tooltip = ({ text, children, side = 'top', delay = 200 }: Props) => {
	const container = usePortalTarget();

	if (!text) {
		return <>{children}</>;
	}

	return (
		<RadixTooltip.Provider delayDuration={delay}>
			<RadixTooltip.Root>
				<RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
				<RadixTooltip.Portal container={container}>
					<RadixTooltip.Content
						side={side}
						sideOffset={6}
						className="z-99999 max-w-xs rounded-lg bg-gray-900 px-3 py-2 text-theme-xs font-medium text-white shadow-tooltip data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 dark:bg-gray-800"
					>
						{text}
						<RadixTooltip.Arrow className="fill-gray-900 dark:fill-gray-800" />
					</RadixTooltip.Content>
				</RadixTooltip.Portal>
			</RadixTooltip.Root>
		</RadixTooltip.Provider>
	);
};
