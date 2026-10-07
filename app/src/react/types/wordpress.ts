/**
 * Data printed by the plugin into the admin page script tags.
 */

export type PluginSettings = Record<string, unknown> & {
	force_global_theme?: string | false;
	remote_sites?: Array<{ url: string; username?: string; app_password?: string }>;
};

export type CurrentUser = {
	id?: number;
	name?: string;
	email?: string;
	avatar?: string;
	roles?: string[];
	allcaps?: Record<string, boolean>;
};

export type WpData = {
	/** Plugin folder URL, used to build icon and asset paths */
	pluginBase: string;
	/** REST root, e.g. https://site.test/wp-json/ */
	restBase: string;
	restNonce: string;
	adminUrl: string;
	loginUrl: string;
	siteUrl: string;
	userId: number;
	userName: string;
	userEmail: string;
	userRoles: string[];
	canManageOptions: boolean;
	currentUser: CurrentUser | null;
	settings: PluginSettings;
	/** Extra payload printed by page specific script tags */
	page: Record<string, unknown>;
};

export type RestListResult<T> = {
	data: T[];
	totalItems: number;
	totalPages: number;
};
