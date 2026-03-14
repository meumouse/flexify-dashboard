import { setupButtonTitleTooltips } from '@/setup/buttonTitleTooltips.js';

const __ = window.wp?.i18n?.__ ?? ((s) => s);

/**
 * Sets global properties from script tag data attributes into the app store
 *
 * @since 2.0.0
 * @param {Object} appStore - The Pinia app store instance
 * @param {string} scriptTagSelector - Optional CSS selector for the script tag (defaults to "#fd-script")
 * @param {string} secondaryScriptTagSelector - Optional CSS selector for a secondary script tag (e.g., "#fd-dashboard-script")
 * @returns {void}
 */
export const setGlobalProperties = ( appStore, scriptTagSelector = '#fd-script', secondaryScriptTagSelector = null ) => {
	// Get script tag
	const scriptTag = document.querySelector(scriptTagSelector);

	// Bail if no script tag
	if (!scriptTag) {
		return;
	}

	if (appStore.state.initialised) {
		return;
	}

	appStore.updateState('initialised', true);
	// Get secondary script tag if provided
	const secondaryScriptTag = secondaryScriptTagSelector
		? document.querySelector(secondaryScriptTagSelector)
		: null;

	// Helper function to safely get and parse JSON attributes
	const getJsonAttribute = (tag, attrName, defaultValue = null) => {
		const value = tag?.getAttribute(attrName);
		
		if (!value) {
			return defaultValue;
		}

		try {
			return JSON.parse(value);
		} catch (e) {
			return defaultValue;
		}
	};

	// Helper function to safely get boolean attributes
	const getBooleanAttribute = (tag, attrName, defaultValue = false) => {
		const value = tag?.getAttribute(attrName);

		if (value === null || value === undefined) {
			return defaultValue;
		}

		return value === 'true' || value === '1';
	};

	// Get data attributes from primary script tag
	const pluginBase = scriptTag.getAttribute('plugin-base');
	const restBase = scriptTag.getAttribute('rest-base');
	const restNonce = scriptTag.getAttribute('rest-nonce');
	const adminUrl = scriptTag.getAttribute('admin-url');
	const loginUrl = scriptTag.getAttribute('login-url');
	const siteURL = scriptTag.getAttribute('site-url');
	const userID = scriptTag.getAttribute('user-id');
	const userName = scriptTag.getAttribute('user-name');
	const userEmail = scriptTag.getAttribute('user-email');
	const menuCacheKey = scriptTag.getAttribute('menu-cache-key');

	let userRoles = getJsonAttribute(scriptTag, 'user-roles', []);
	let frontPage = getBooleanAttribute(scriptTag, 'front-page', false);
	let uipcSettings = getJsonAttribute(scriptTag, 'flexify-dashboard-settings', {});
	let canManageOptions = getBooleanAttribute(
		scriptTag,
		'can-manage-options',
		false
	);

	// Additional attributes that may be present
	let postTypes = getJsonAttribute(scriptTag, 'post_types', null);
	let mimeTypes = getJsonAttribute(scriptTag, 'mime_types', null);
	let activePlugins = getJsonAttribute(scriptTag, 'active-plugins', []);
	let currentUser = getJsonAttribute(scriptTag, 'current-user', null);
	let userAllcaps = getJsonAttribute(scriptTag, 'user-allcaps', null);

	// Merge allcaps into currentUser if both exist
	if (currentUser !== null && userAllcaps !== null) {
		currentUser = {
			...currentUser,
			allcaps: userAllcaps,
		};
	}

	// Remove the user-allcaps attribute from DOM after reading it (for security)
	// Keep current-user attribute intact as it contains basic user details
	if (userAllcaps !== null) {
		scriptTag.removeAttribute('user-allcaps');
	}

	// Get attributes from secondary script tag if provided
	let dashboardData = null;
	let supportsCategories = null;
	let supportsTags = null;
	let postStatuses = null;
	let pluginsList = null;
	let themeColors = getJsonAttribute(scriptTag, 'theme-colors', []);
	let themeSpacing = getJsonAttribute(scriptTag, 'theme-spacing', []);

	if (secondaryScriptTag) {
		dashboardData = getJsonAttribute(
			secondaryScriptTag,
			'dashboard-data',
			null
		);
		supportsCategories = getBooleanAttribute(
			secondaryScriptTag,
			'supports_categories',
			null
		);
		supportsTags = getBooleanAttribute(
			secondaryScriptTag,
			'supports_tags',
			null
		);
		postStatuses = getJsonAttribute(secondaryScriptTag, 'post_statuses', null);
		pluginsList = getJsonAttribute(secondaryScriptTag, 'plugins', null);
	}

	// Update store properties (always update to match original behavior)
	appStore.updateState('pluginBase', pluginBase);
	appStore.updateState('restBase', restBase);
	appStore.updateState('restNonce', restNonce);
	appStore.updateState('adminUrl', adminUrl);
	appStore.updateState('loginUrl', loginUrl);
	appStore.updateState('siteURL', siteURL);
	appStore.updateState('userID', userID);
	appStore.updateState('userRoles', userRoles);
	appStore.updateState('userName', userName);
	appStore.updateState('userEmail', userEmail);
	appStore.updateState('frontPage', frontPage);
	appStore.updateState('flexify_dashboard_settings', uipcSettings);
	appStore.updateState('canManageOptions', canManageOptions);
	appStore.updateState('themeColors', themeColors);
	appStore.updateState('themeSpacing', themeSpacing);

	if (menuCacheKey) {
		appStore.updateState('menuCacheKey', menuCacheKey);
	}

	// Update optional properties if they exist (from primary or secondary script tag)
	if (postTypes !== null) appStore.updateState('postTypes', postTypes);
	if (mimeTypes !== null) appStore.updateState('mimeTypes', mimeTypes);
	if (activePlugins !== null && Array.isArray(activePlugins))
		appStore.updateState('activePlugins', activePlugins);
	if (currentUser !== null) appStore.updateState('currentUser', currentUser);
	if (dashboardData !== null)
		appStore.updateState('dashboard_data', dashboardData);
	if (supportsCategories !== null)
		appStore.updateState('supports_categories', supportsCategories);
	if (supportsTags !== null)
		appStore.updateState('supports_tags', supportsTags);
	if (postStatuses !== null) appStore.updateState('postStatuses', postStatuses);
	if (pluginsList !== null) appStore.updateState('pluginsList', pluginsList);
};

/**
 * Sets Vue global properties for translation functions
 *
 * @param {Object} app - Vue app instance
 * @returns {void}
 */
export const setVueGlobalProperties = (app) => {
	app.config.globalProperties.__ = __;
	app.config.globalProperties.sprintf = sprintf;

	setupButtonTitleTooltips();
};