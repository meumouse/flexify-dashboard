/**
 * Single source of truth for the design system classes.
 *
 * The recipes themselves are plain JavaScript in `shared/`, which is where they stayed when
 * the Vue kit went: they are strings of class names and belong to no framework.
 */
export {
	buttonBase,
	buttonVariants,
	buttonSizes,
	iconButtonSizes,
	fieldBase,
	fieldStates,
	fieldSizes,
	labelClass,
	hintClasses,
	cardClass,
	dropdownPanelClass,
	dropdownItemClass,
	badgeColors,
	alertColors,
} from '@/shared/recipes.js';

export type ButtonVariant = 'primary' | 'outline' | 'secondary' | 'danger' | 'danger-outline' | 'warning' | 'success' | 'ghost' | 'link';
export type ControlSize = 'xs' | 'sm' | 'md' | 'lg';
export type FieldSize = 'sm' | 'md' | 'lg';
export type FieldState = 'default' | 'error' | 'success';
export type BadgeColor = 'primary' | 'success' | 'error' | 'warning' | 'info' | 'orange' | 'purple' | 'light' | 'dark';
export type AlertVariant = 'success' | 'error' | 'warning' | 'info';
