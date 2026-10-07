import { __ } from '@/react/lib/i18n';

/**
 * The sections of the settings screen, in the order they are shown.
 *
 * The settings themselves live in the shared schema; this only says how the sections are
 * named and what they are about.
 */

export type SettingsCategory = { value: string; label: string; icon: string; description: string };

export const CATEGORIES = (): SettingsCategory[] => [
	{ value: 'general', label: __('General'), icon: 'settings', description: __('Core plugin settings and the licence') },
	{ value: 'login', label: __('Login'), icon: 'login', description: __('How the login page looks and what guards it') },
	{ value: 'theme', label: __('Theme'), icon: 'palette', description: __('Colours, styling and the look of the admin') },
	{ value: 'whitelabel', label: __('White label'), icon: 'diamond_shine', description: __('Rebrand the interface: names, text and icons') },
	{ value: 'menu', label: __('Menu'), icon: 'menu', description: __('How the admin menu behaves') },
	{ value: 'posts', label: __('Posts'), icon: 'article', description: __('Managing and showing posts') },
	{ value: 'plugins', label: __('Plugins'), icon: 'extension', description: __('The plugins screen') },
	{ value: 'dashboard', label: __('Dashboard'), icon: 'dashboard', description: __('The custom dashboard and the admin interface') },
	{ value: 'analytics', label: __('Analytics'), icon: 'analytics', description: __('What is measured and how') },
	{ value: 'integrations', label: __('Integrations'), icon: 'api', description: __('Outside services and their keys') },
	{ value: 'media', label: __('Media'), icon: 'image', description: __('The media library and uploads') },
	{ value: 'users', label: __('Users'), icon: 'people', description: __('Managing the people with an account') },
	{ value: 'comments', label: __('Comments'), icon: 'comment', description: __('Moderating comments') },
	{ value: 'woocommerce', label: __('WooCommerce'), icon: 'storefront', description: __('The products and orders screens') },
	{ value: 'security', label: __('Security'), icon: 'security', description: __('What is guarded and how') },
	{ value: 'database', label: __('Database'), icon: 'database', description: __('The database explorer') },
	{ value: 'advanced', label: __('Advanced'), icon: 'warning', description: __('Resetting the plugin and other things that are hard to undo') },
];
