/**
 * Single source of truth for the design system classes.
 *
 * The recipes live in plain JavaScript so the Vue kit and the React kit render identical
 * styles while both exist. When the Vue kit is removed this file becomes the recipes themselves.
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
} from '@/components/kit/recipes.js';

export type ButtonVariant = 'primary' | 'outline' | 'secondary' | 'danger' | 'danger-outline' | 'warning' | 'success' | 'ghost' | 'link';
export type ControlSize = 'xs' | 'sm' | 'md' | 'lg';
export type FieldSize = 'sm' | 'md' | 'lg';
export type FieldState = 'default' | 'error' | 'success';
export type BadgeColor = 'primary' | 'success' | 'error' | 'warning' | 'info' | 'orange' | 'purple' | 'light' | 'dark';
export type AlertVariant = 'success' | 'error' | 'warning' | 'info';
