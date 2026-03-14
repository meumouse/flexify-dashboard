/**
 * Settings Configuration
 *
 * Defines all settings as an array of objects with their properties.
 * Each setting object contains:
 * - id: Unique identifier (matches the setting key in flexify_dashboard_settings)
 * - category: Which category tab this setting belongs to
 * - type: The component type to render (toggle, input, image-select, etc.)
 * - label: Setting label text
 * - description: Setting description text
 * - requiresActivation: Whether setting requires license activation
 * - componentProps: Additional props to pass to the component
 * - condition: Function or property path to check if setting should be shown
 * - customComponent: For special cases that need custom rendering
 * - customRender: For completely custom rendering logic
 *
 * @since 1.0.0
 */

/**
 * Get submenu style options
 * @returns {Array} Submenu style options
 */
const getSubmenuStyles = () => [
  { value: 'click', label: __('Click', 'flexify-dashboard') },
  { value: 'hover', label: __('Hover', 'flexify-dashboard') },
];

/**
 * Get force global theme options
 * @returns {Array} Force global theme options
 */
const getForceGlobalThemeOptions = () => [
  { value: 'off', label: __('Off', 'flexify-dashboard') },
  { value: 'light', label: __('Light', 'flexify-dashboard') },
  { value: 'dark', label: __('Dark', 'flexify-dashboard') },
];

/**
 * Get analytics provider options
 * @returns {Array} Analytics provider options
 */
const getAnalyticsProviderOptions = () => [
  { value: 'flexify-dashboard', label: __('Built-in Analytics', 'flexify-dashboard') },
  { value: 'google_analytics', label: __('Google Analytics 4', 'flexify-dashboard') },
];

/**
 * Settings configuration array
 * @type {Array<Object>}
 */
export const settingsConfig = [
  // ============================================
  // GENERAL SETTINGS
  // ============================================

  // License key - Special case, handled separately
  {
    id: 'license_key',
    category: 'general',
    type: 'custom',
    label: __('Licence key', 'flexify-dashboard'),
    description: __(
      'Activating Flexify Dashboard enables updates and features',
      'flexify-dashboard'
    ),
    requiresActivation: false,
    customRender: 'license-key',
  },

  {
    id: 'logo',
    category: 'general',
    type: 'image-select',
    label: __('Logo', 'flexify-dashboard'),
    description: __(
      'Optional logo for to be displayed in the menu',
      'flexify-dashboard'
    ),
    requiresActivation: true,
    componentProps: {
      placeholder: __('Logo url', 'flexify-dashboard'),
    },
  },

  {
    id: 'dark_logo',
    category: 'general',
    type: 'image-select',
    label: __('Dark mode logo', 'flexify-dashboard'),
    description: __(
      "Set an alternative logo to use in dark mode. If one isn't set it will fall back to the standard logo.",
      'flexify-dashboard'
    ),
    requiresActivation: true,
    componentProps: {
      placeholder: __('Dark Logo url', 'flexify-dashboard'),
    },
  },

  {
    id: 'remote_sites',
    category: 'general',
    type: 'custom',
    label: __('Remote Sites', 'flexify-dashboard'),
    description: __(
      'Configure remote WordPress sites for cross-site operations.',
      'flexify-dashboard'
    ),
    requiresActivation: false,
    customRender: 'remote-sites',
  },

  {
    id: 'remote_site_switcher_capability',
    category: 'general',
    type: 'input',
    label: __('Remote Site Switcher Capability', 'flexify-dashboard'),
    description: __(
      'WordPress capability required to see the remote site switcher in the toolbar. Defaults to "manage_options" (admin users). Users with this capability or below will see the switcher.',
      'flexify-dashboard'
    ),
    requiresActivation: false,
    componentProps: {
      placeholder: 'manage_options',
      class: 'max-w-[300px]',
    },
  },

  {
    id: 'disable_theme',
    category: 'general',
    type: 'user-role-select',
    label: __('Disable theme', 'flexify-dashboard'),
    description: __(
      'Choose roles or usersnames to disable the theme for.',
      'flexify-dashboard'
    ),
    requiresActivation: true,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },

  {
    id: 'search_post_types',
    category: 'general',
    type: 'post-type-select',
    label: __('Search post types', 'flexify-dashboard'),
    description: __(
      'Choose which post types are available in the global search',
      'flexify-dashboard'
    ),
    requiresActivation: true,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },

  {
    id: 'disable_search',
    category: 'general',
    type: 'toggle',
    label: __('Disable global search', 'flexify-dashboard'),
    description: __('Disable global search for all users.', 'flexify-dashboard'),
    requiresActivation: true,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },
  /*
  {
    id: 'layout',
    category: 'general',
    type: 'custom',
    label: __('Admin layout', 'flexify-dashboard'),
    description: __('Choose your prefered admin layout', 'flexify-dashboard'),
    requiresActivation: true,
    customRender: 'layout-selector',
  },
  */
  // ============================================
  // LOGIN SETTINGS
  // ============================================

  {
    id: 'style_login',
    category: 'login',
    type: 'toggle',
    label: __('Modernise login page', 'flexify-dashboard'),
    description: __(
      'When enabled, Flexify Dashboard will modernise the default login page.',
      'flexify-dashboard'
    ),
    requiresActivation: true,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },

  {
    id: 'login_image',
    category: 'login',
    type: 'image-select',
    label: __('Login image', 'flexify-dashboard'),
    description: __(
      'Optional image that will be added to the empty panel in the login page',
      'flexify-dashboard'
    ),
    requiresActivation: true,
    componentProps: {
      placeholder: __('Image url', 'flexify-dashboard'),
    },
  },
  {
    id: 'modern_login_logo',
    category: 'login',
    type: 'image-select',
    label: __('Modern login logo', 'flexify-dashboard'),
    description: __(
      'Optional logo displayed in the modern login screen. When empty, the default dashboard logo will be used.',
      'flexify-dashboard'
    ),
    requiresActivation: true,
    componentProps: {
      placeholder: __('Logo url', 'flexify-dashboard'),
    },
    condition: (settings) => settings.style_login === true,
  },
  {
    id: 'login_path',
    category: 'login',
    type: 'input',
    label: __('Login path', 'flexify-dashboard'),
    description: __(
      'Change the login url from wp-login.php to a custom slug. Ensure you remember what you change this to.',
      'flexify-dashboard'
    ),
    requiresActivation: true,
    componentProps: {
      type: 'text',
      placeholder: 'wp-login.php',
      class: 'max-w-[300px]',
    },
  },

  {
    id: 'hide_language_selector',
    category: 'login',
    type: 'toggle',
    label: __('Hide language selector', 'flexify-dashboard'),
    description: __(
      'When hidden the language selector on the login page will not be displayed',
      'flexify-dashboard'
    ),
    requiresActivation: true,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },

  {
    id: 'enable_turnstyle',
    category: 'login',
    type: 'toggle',
    label: __('Enable TurnStyle', 'flexify-dashboard'),
    description: __(
      'When enabled, a cloudflare turnstyle challenge will be displayed on the login page to enhance security. Cloudflare account is required',
      'flexify-dashboard'
    ),
    requiresActivation: true,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },

  {
    id: 'turnstyle_site_key',
    category: 'login',
    type: 'input',
    label: __('Turnstyle site key', 'flexify-dashboard'),
    description: __(
      'This is the site key for your turnstyle which can be created from your cloudflare dashboard.',
      'flexify-dashboard'
    ),
    requiresActivation: true,
    componentProps: {
      type: 'password',
      placeholder: '',
      class: 'max-w-[300px]',
    },
    condition: (settings) => settings.enable_turnstyle === true,
  },

  {
    id: 'turnstyle_secret_key',
    category: 'login',
    type: 'input',
    label: __('Turnstyle secret key', 'flexify-dashboard'),
    description: __(
      'This is the secret key for your turnstyle which can be created from your cloudflare dashboard.',
      'flexify-dashboard'
    ),
    requiresActivation: true,
    componentProps: {
      type: 'password',
      placeholder: '',
      class: 'max-w-[300px]',
    },
    condition: (settings) => settings.enable_turnstyle === true,
  },

  // ============================================
  // THEME SETTINGS
  // ============================================

  {
    id: 'force_global_theme',
    category: 'theme',
    type: 'select',
    label: __('Force global theme', 'flexify-dashboard'),
    description: __(
      'When enabled, the light / dark toggle will be removed and the selected theme set for all users.',
      'flexify-dashboard'
    ),
    requiresActivation: true,
    componentProps: {
      class: 'max-w-[300px]',
    },
    getOptions: getForceGlobalThemeOptions,
  },

  {
    id: 'hide_screenoptions',
    category: 'theme',
    type: 'toggle',
    label: __('Hide screen options', 'flexify-dashboard'),
    description: __(
      'Hide the screen options toggle in the toolbar',
      'flexify-dashboard'
    ),
    requiresActivation: true,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },

  {
    id: 'hide_help_toggle',
    category: 'theme',
    type: 'toggle',
    label: __('Hide help toggle', 'flexify-dashboard'),
    description: __('Hide the help toggle in the toolbar', 'flexify-dashboard'),
    requiresActivation: true,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },

  {
    id: 'base_theme_color',
    category: 'theme',
    type: 'custom',
    label: __('Base theme colors', 'flexify-dashboard'),
    description: __(
      'Set a base color and Flexify Dashboard will automatically create a color scale for you.',
      'flexify-dashboard'
    ),
    requiresActivation: true,
    customRender: 'color-scale',
    customProps: {
      colorKey: 'base_theme_color',
      scaleKey: 'base_theme_scale',
      scaleLabel: __('Base', 'flexify-dashboard'),
    },
  },

  {
    id: 'accent_theme_color',
    category: 'theme',
    type: 'custom',
    label: __('Accent theme colors', 'flexify-dashboard'),
    description: __(
      'Set a accent color and Flexify Dashboard will automatically create a color scale for you.',
      'flexify-dashboard'
    ),
    requiresActivation: true,
    customRender: 'color-scale',
    customProps: {
      colorKey: 'accent_theme_color',
      scaleKey: 'accent_theme_scale',
      scaleLabel: __('Accent base', 'flexify-dashboard'),
    },
  },

  {
    id: 'custom_css',
    category: 'theme',
    type: 'custom',
    label: __('Custom css', 'flexify-dashboard'),
    description: __(
      'Custom css added here will only be added in the admin area and login page.',
      'flexify-dashboard'
    ),
    requiresActivation: true,
    customRender: 'code-editor',
  },

  {
    id: 'external_stylesheets',
    category: 'theme',
    type: 'custom',
    label: __('External stylesheets', 'flexify-dashboard'),
    description: __(
      'Add URLs to any external stylesheets you want Flexify Dashboard to load into the admin',
      'flexify-dashboard'
    ),
    requiresActivation: true,
    customRender: 'external-stylesheets',
  },

  {
    id: 'custom_font',
    category: 'theme',
    type: 'custom',
    label: __('Custom Font', 'flexify-dashboard'),
    description: __(
      'Choose a custom font for the admin interface. Select from Google Fonts, enter a custom font URL, or upload your own font files.',
      'flexify-dashboard'
    ),
    requiresActivation: true,
    customRender: 'font-selector',
  },

  // ============================================
  // WHITELABEL SETTINGS
  // ============================================

  {
    id: 'admin_favicon',
    category: 'whitelabel',
    type: 'image-select',
    label: __('Admin favicon', 'flexify-dashboard'),
    description: __(
      'Optional favicon to replace the WordPress favicon in the admin.',
      'flexify-dashboard'
    ),
    requiresActivation: true,
    componentProps: {
      placeholder: __('Favicon url', 'flexify-dashboard'),
    },
  },

  {
    id: 'plugin_name',
    category: 'whitelabel',
    type: 'input',
    label: __('Rename Flexify Dashboard', 'flexify-dashboard'),
    description: __(
      "This will rename Flexify Dashboard in the plugins list as well as renaming it's settings link.",
      'flexify-dashboard'
    ),
    requiresActivation: true,
    componentProps: {
      type: 'text',
      placeholder: 'Flexify Dashboard',
      class: 'max-w-[300px]',
    },
  },

  {
    id: 'text_replacements',
    category: 'whitelabel',
    type: 'custom',
    label: __('Text Replacement', 'flexify-dashboard'),
    description: __(
      'Customize the text displayed in the WordPress admin area. Enter original words or phrases and their replacements to white-label the admin interface.',
      'flexify-dashboard'
    ),
    requiresActivation: true,
    customRender: 'text-pairs',
  },

  // ============================================
  // MENU SETTINGS
  // ============================================

  {
    id: 'submenu_style',
    category: 'menu',
    type: 'select',
    label: __('Submenu style', 'flexify-dashboard'),
    description: __(
      'Choose from whether the submenu opens on click or hover.',
      'flexify-dashboard'
    ),
    requiresActivation: true,
    componentProps: {
      class: 'max-w-[300px]',
    },
    getOptions: getSubmenuStyles,
  },

  {
    id: 'enable_admin_menu_search',
    category: 'menu',
    type: 'toggle',
    label: __('Enable Admin Menu Search', 'flexify-dashboard'),
    description: __(
      'Enable search functionality in the admin menu to quickly find menu items.',
      'flexify-dashboard'
    ),
    requiresActivation: true,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },

  // ============================================
  // POSTS SETTINGS
  // ============================================

  {
    id: 'use_classic_post_tables',
    category: 'posts',
    type: 'toggle',
    label: __('Classic Post List View', 'flexify-dashboard'),
    description: __(
      "Switch to WordPress's traditional table layout for posts, removing the modern interface.",
      'flexify-dashboard'
    ),
    requiresActivation: false,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },

  /*{
    id: 'use_modern_post_editor',
    category: 'posts',
    type: 'toggle',
    label: __('Modern Post Editor', 'flexify-dashboard'),
    description: __(
      'Replace the built-in WordPress editor with a modern, enhanced post editor interface.',
      'flexify-dashboard'
    ),
    requiresActivation: false,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },

  {
    id: 'modern_post_editor_post_types',
    category: 'posts',
    type: 'post-type-select',
    label: __('Post Types for Modern Editor', 'flexify-dashboard'),
    description: __(
      'Choose which post types should use the modern post editor. Defaults to posts.',
      'flexify-dashboard'
    ),
    requiresActivation: false,
    condition: (settings) => settings.use_modern_post_editor === true,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },

  {
    id: 'enable_realtime_collaboration',
    category: 'posts',
    type: 'toggle',
    label: __('Real-time Collaboration', 'flexify-dashboard'),
    description: __(
      'Enable real-time collaboration in the modern post editor. Multiple users can edit the same post simultaneously with live cursor tracking and synced changes.',
      'flexify-dashboard'
    ),
    requiresActivation: false,
    condition: (settings) => settings.use_modern_post_editor === true,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },*/

  // ============================================
  // PLUGINS SETTINGS
  // ============================================

  {
    id: 'use_modern_plugin_page',
    category: 'plugins',
    type: 'toggle',
    label: __('Modern Plugin Manager', 'flexify-dashboard'),
    description: __(
      'Replace the classic plugins page with a modern plugin manager with plugin profiling and improved features.',
      'flexify-dashboard'
    ),
    requiresActivation: false,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },
  {
    id: 'hidden_plugin_update_notifications',
    category: 'plugins',
    type: 'plugin-select',
    label: __('Hide plugin update notifications for selected plugins', 'flexify-dashboard'),
    description: __(
      'Select the plugins that should not display available update notices in the Plugins table.',
      'flexify-dashboard'
    ),
    requiresActivation: false,
  },
  {
    id: 'show_hidden_plugin_update_notifications_for',
    category: 'plugins',
    type: 'user-role-select',
    label: __('Always show hidden update notifications for specific users/roles', 'flexify-dashboard'),
    description: __(
      'Optional allow list. Selected users or roles (for example, Editor) will still see update notifications for hidden plugins.',
      'flexify-dashboard'
    ),
    requiresActivation: false,
    componentProps: {
      class: 'max-w-[560px]',
    },
  },

  // ============================================
  // MEDIA SETTINGS
  // ============================================

  {
    id: 'use_modern_media_page',
    category: 'media',
    type: 'toggle',
    label: __('Modern Media Library', 'flexify-dashboard'),
    description: __(
      'Replace the classic WordPress media library with a modern, responsive media manager with improved upload and organization features.',
      'flexify-dashboard'
    ),
    requiresActivation: false,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },

  {
    id: 'enable_svg_uploads',
    category: 'media',
    type: 'toggle',
    label: __('Enable SVG Uploads', 'flexify-dashboard'),
    description: __(
      'Allow SVG (Scalable Vector Graphics) files to be uploaded to the media library. All SVG files are automatically sanitized before upload to remove potentially malicious code, ensuring safe handling of SVG files.',
      'flexify-dashboard'
    ),
    requiresActivation: false,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },

  {
    id: 'enable_font_uploads',
    category: 'media',
    type: 'toggle',
    label: __('Enable Font Uploads', 'flexify-dashboard'),
    description: __(
      'Allow font files (.woff2, .woff, .ttf, .otf) to be uploaded to the media library. This enables custom font support for your site.',
      'flexify-dashboard'
    ),
    requiresActivation: false,
    default: true,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },

  // ============================================
  // USERS SETTINGS
  // ============================================

  {
    id: 'use_modern_users_page',
    category: 'users',
    type: 'toggle',
    label: __('Modern Users Page', 'flexify-dashboard'),
    description: __(
      'Replace the classic WordPress users page with a modern, responsive user manager with improved features and better organization.',
      'flexify-dashboard'
    ),
    requiresActivation: false,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },

  {
    id: 'use_modern_comments_page',
    category: 'comments',
    type: 'toggle',
    label: __('Modern Comments Page', 'flexify-dashboard'),
    description: __(
      'Replace the classic WordPress comments page with a modern, responsive comment manager with improved features and better organization.',
      'flexify-dashboard'
    ),
    requiresActivation: false,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },

  // ============================================
  // DASHBOARD SETTINGS
  // ============================================

  {
    id: 'use_custom_dashboard',
    category: 'dashboard',
    type: 'toggle',
    label: __('Custom Dashboard', 'flexify-dashboard'),
    description: __(
      'Replace the default WordPress dashboard with a modern, customizable dashboard interface.',
      'flexify-dashboard'
    ),
    requiresActivation: false,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },

  // ============================================
  // ANALYTICS SETTINGS
  // ============================================

  {
    id: 'enable_flexify_dashboard_analytics',
    category: 'analytics',
    type: 'toggle',
    label: __('Enable Flexify Dashboard Analytics', 'flexify-dashboard'),
    description: __(
      'Enable built-in analytics to track user behavior, page views, and performance metrics within your WordPress admin.',
      'flexify-dashboard'
    ),
    requiresActivation: true,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },

  {
    id: 'analytics_provider',
    category: 'analytics',
    type: 'select',
    label: __('Analytics Provider', 'flexify-dashboard'),
    description: __(
      'Choose which analytics provider to use for dashboard data. Select Built-in Analytics to use the Flexify Dashboard tracking system, or Google Analytics to display data from your GA4 property.',
      'flexify-dashboard'
    ),
    requiresActivation: true,
    condition: (settings) => Boolean(settings.enable_flexify_dashboard_analytics),
    componentProps: {
      class: 'max-w-[300px]',
    },
    getOptions: getAnalyticsProviderOptions,
  },

  {
    id: 'google_analytics_connection',
    category: 'analytics',
    type: 'custom',
    label: __('Google Analytics Connection', 'flexify-dashboard'),
    description: __(
      'Connect your Google Analytics 4 property to display analytics data in the dashboard. You will need to create OAuth credentials in Google Cloud Console.',
      'flexify-dashboard'
    ),
    requiresActivation: true,
    customRender: 'google-analytics-connection',
    condition: (settings) =>
      Boolean(settings.enable_flexify_dashboard_analytics) &&
      settings.analytics_provider === 'google_analytics',
  },

  // ============================================
  // DATABASE SETTINGS
  // ============================================

  {
    id: 'enable_database_explorer',
    category: 'database',
    type: 'toggle',
    label: __('Enable Database Explorer', 'flexify-dashboard'),
    description: __(
      'Enable the modern database explorer interface to browse tables, view data, and execute SQL queries safely.',
      'flexify-dashboard'
    ),
    requiresActivation: false,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },

  // ============================================
  // SECURITY SETTINGS (Role Editor)
  // ============================================

  {
    id: 'enable_role_editor',
    category: 'security',
    type: 'toggle',
    label: __('Enable Role Editor', 'flexify-dashboard'),
    description: __(
      'Enable the modern role editor interface to manage WordPress user roles and capabilities.',
      'flexify-dashboard'
    ),
    requiresActivation: false,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },

  // ============================================
  // CUSTOM POST TYPES SETTINGS
  // ============================================
  /*
  {
    id: 'enable_custom_post_types',
    category: 'general',
    type: 'toggle',
    label: __('Enable Custom Post Types', 'flexify-dashboard'),
    description: __(
      'Enable the custom post types creator to register and manage custom post types without code. Post types are stored in a JSON file for performance.',
      'flexify-dashboard'
    ),
    requiresActivation: false,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },
*/
  // ============================================
  // ACTIVITY LOG SETTINGS
  // ============================================

  {
    id: 'enable_activity_logger',
    category: 'security',
    type: 'toggle',
    label: __('Enable Activity Logger', 'flexify-dashboard'),
    description: __(
      'Track and log all admin actions including post changes, user updates, plugin activations, and more.',
      'flexify-dashboard'
    ),
    requiresActivation: false,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },

  {
    id: 'activity_log_retention_days',
    category: 'security',
    type: 'input',
    label: __('Retention Period (Days)', 'flexify-dashboard'),
    description: __(
      'How many days to keep activity logs before automatic cleanup. Default is 90 days.',
      'flexify-dashboard'
    ),
    requiresActivation: false,
    condition: (settings) => settings.enable_activity_logger === true,
    componentProps: {
      type: 'number',
      min: 1,
      max: 365,
      placeholder: '90',
      class: 'max-w-[200px]',
    },
  },

  {
    id: 'activity_log_level',
    category: 'security',
    type: 'select',
    label: __('Log Level', 'flexify-dashboard'),
    description: __(
      'Choose which actions to log. "All Actions" logs everything, "Important Only" logs only critical actions like deletions and role changes.',
      'flexify-dashboard'
    ),
    requiresActivation: false,
    condition: (settings) => settings.enable_activity_logger === true,
    componentProps: {
      options: [
        { value: 'all', label: __('All Actions', 'flexify-dashboard') },
        { value: 'important', label: __('Important Only', 'flexify-dashboard') },
      ],
      class: 'max-w-[200px]',
    },
  },

  {
    id: 'activity_log_auto_cleanup',
    category: 'security',
    type: 'toggle',
    label: __('Auto Cleanup', 'flexify-dashboard'),
    description: __(
      'Automatically delete logs older than the retention period. Disable to keep logs indefinitely.',
      'flexify-dashboard'
    ),
    requiresActivation: false,
    condition: (settings) => settings.enable_activity_logger === true,
    componentProps: {
      class: 'max-w-[300px]',
    },
  },
];

/**
 * Get settings for a specific category
 * @param {string} category - The category to filter by
 * @param {Object} settings - Current settings object for condition checking
 * @param {boolean} isActivated - Whether license is activated
 * @returns {Array<Object>} Filtered settings array
 */
export const getSettingsForCategory = (
  category,
  settings = {},
  isActivated = false
) => {
  return settingsConfig.filter((setting) => {
    // Filter by category
    if (setting.category !== category) return false;

    // Filter by activation requirement
    if (setting.requiresActivation && !isActivated) return false;

    // Check condition if present
    if (setting.condition && typeof setting.condition === 'function') {
      return setting.condition(settings);
    }

    return true;
  });
};
