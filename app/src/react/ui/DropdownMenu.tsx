import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import { Fragment, type ReactNode } from 'react';
import { cn } from '@/react/lib/cn';
import { Icon } from '@/react/ui/Icon';
import { usePortalTarget } from '@/react/hooks/usePortalTarget';
import { dropdownItemClass, dropdownPanelClass } from '@/react/ui/recipes';

export type MenuItem =
	| { separator: true }
	| { heading: string }
	| {
			label: string;
			icon?: string;
			href?: string;
			target?: string;
			danger?: boolean;
			disabled?: boolean;
			onSelect?: () => void;
	  };

type Props = {
	items: MenuItem[];
	/** Element that opens the menu */
	trigger: ReactNode;
	align?: 'start' | 'center' | 'end';
	side?: 'top' | 'right' | 'bottom' | 'left';
	/** Tailwind width class for the panel */
	width?: string;
	contentClassName?: string;
};

const isSeparator = (item: MenuItem): item is { separator: true } => 'separator' in item;
const isHeading = (item: MenuItem): item is { heading: string } => 'heading' in item;

export const DropdownMenu = ({ items, trigger, align = 'end', side = 'bottom', width = 'w-48', contentClassName }: Props) => {
	const container = usePortalTarget();

	return (
		<RadixMenu.Root>
			<RadixMenu.Trigger asChild>{trigger}</RadixMenu.Trigger>
			<RadixMenu.Portal container={container}>
				<RadixMenu.Content
					align={align}
					side={side}
					sideOffset={6}
					className={cn(dropdownPanelClass, width, 'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95', contentClassName)}
				>
					{items.map((item, index) => {
						if (isSeparator(item)) {
							return <RadixMenu.Separator key={`separator-${index}`} className="my-1 h-px bg-gray-100 dark:bg-gray-800" />;
						}

						if (isHeading(item)) {
							return (
								<RadixMenu.Label key={`heading-${index}`} className="px-3 pb-1 pt-2 text-theme-xs font-medium uppercase tracking-wide text-gray-400">
									{item.heading}
								</RadixMenu.Label>
							);
						}

						const className = cn(dropdownItemClass, item.danger && 'text-error-500 hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10');
						const content = (
							<Fragment>
								{item.icon ? <Icon name={item.icon} className="text-base" /> : null}
								<span className="truncate">{item.label}</span>
							</Fragment>
						);

						return (
							<RadixMenu.Item
								key={`${item.label}-${index}`}
								disabled={item.disabled}
								onSelect={() => item.onSelect?.()}
								asChild={Boolean(item.href)}
								className={item.href ? undefined : className}
							>
								{item.href ? (
									<a href={item.href} target={item.target} rel={item.target === '_blank' ? 'noopener noreferrer' : undefined} className={className}>
										{content}
									</a>
								) : (
									content
								)}
							</RadixMenu.Item>
						);
					})}
				</RadixMenu.Content>
			</RadixMenu.Portal>
		</RadixMenu.Root>
	);
};
