/**
 * The settings schema, which is plain data and shared with the Vue screen.
 *
 * It says what every setting is — its category, its kind, its label, when it applies — and
 * both screens read the same file, so a setting added to one appears in the other.
 */

declare module '@/pages/settings/src/settings-config.js' {
	export type SettingType =
		| 'toggle'
		| 'input'
		| 'password'
		| 'number'
		| 'text'
		| 'select'
		| 'image-select'
		| 'user-role-select'
		| 'post-type-select'
		| 'plugin-select'
		| 'custom';

	export type SettingDefinition = {
		id: string;
		category: string;
		type: SettingType;
		label: string;
		description?: string;
		requiresActivation?: boolean;
		componentProps?: Record<string, unknown>;
		/** Named renderer for the settings that are their own small screen */
		customRender?: string;
		/** Shown only when this says so, given the current settings */
		condition?: (settings: Record<string, unknown>) => boolean;
	};

	export const settingsConfig: SettingDefinition[];
}
