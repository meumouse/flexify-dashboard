import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/react/lib/cn';
import { Icon } from '@/react/ui/Icon';
import { Spinner } from '@/react/ui/Spinner';
import { buttonBase, buttonSizes, buttonVariants, iconButtonSizes, type ButtonVariant, type ControlSize } from '@/react/ui/recipes';

type CommonProps = {
	variant?: ButtonVariant;
	size?: ControlSize;
	/** Icon name from `assets/icons`, rendered before the label */
	icon?: string;
	/** Icon name rendered after the label */
	iconRight?: string;
	/** Square button with no label; always pass `aria-label` */
	iconOnly?: boolean;
	loading?: boolean;
	block?: boolean;
	className?: string;
	children?: ReactNode;
};

type ButtonProps = CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> & { href?: undefined };
type LinkProps = CommonProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'className'> & { href: string };

export type FdButtonProps = ButtonProps | LinkProps;

// Directional icons point the other way in right-to-left languages.
const DIRECTIONAL_ICONS = ['chevron_left', 'chevron_right', 'arrow_back', 'arrow_forward', 'arrow_left_alt', 'arrow_right', 'first_page', 'last_page'];

const iconClass = (name: string, size: ControlSize) =>
	cn(size === 'xs' ? 'text-theme-md' : 'text-theme-lg', DIRECTIONAL_ICONS.includes(name) && 'rtl:rotate-180');

/**
 * Button of the design system. Renders an anchor when `href` is set.
 */
export const Button = forwardRef<HTMLButtonElement & HTMLAnchorElement, FdButtonProps>(function Button(
	{ variant = 'primary', size = 'md', icon, iconRight, iconOnly = false, loading = false, block = false, className, children, ...rest },
	ref
) {
	const classes = cn(
		buttonBase,
		buttonVariants[variant] ?? buttonVariants.primary,
		iconOnly ? iconButtonSizes[size] : buttonSizes[size],
		block && 'w-full',
		className
	);

	const content = (
		<>
			{loading ? <Spinner className="h-4 w-4" /> : icon ? <Icon name={icon} className={iconClass(icon, size)} /> : null}
			{children}
			{iconRight && !loading ? <Icon name={iconRight} className={iconClass(iconRight, size)} /> : null}
		</>
	);

	if ('href' in rest && rest.href !== undefined) {
		const { href, ...anchorProps } = rest as LinkProps;

		return (
			<a {...anchorProps} ref={ref} href={href} className={classes}>
				{content}
			</a>
		);
	}

	const { type = 'button', disabled, ...buttonProps } = rest as ButtonProps;

	return (
		<button {...buttonProps} ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={classes}>
			{content}
		</button>
	);
});
