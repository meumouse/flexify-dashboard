/**
 * Settings Component Map
 * 
 * Maps setting types to their Vue components.
 * This allows dynamic rendering of settings based on their type.
 * 
 * @since 1.0.0
 */

import { defineAsyncComponent } from 'vue';

// Standard components
import AppInput from '@/components/utility/text-input/index.vue';
import AppToggle from '@/components/utility/toggle/index.vue';
import AppSelect from '@/components/utility/select/index.vue';
import UserRoleSelect from '@/components/utility/multiselect-roles-and-users/index.vue';
import PostTypeSelect from '@/components/utility/post-type-select/index.vue';
import ColorPicker from '@/components/utility/color-select/index.vue';
import ImageSelect from '@/components/utility/image-select/index.vue';
import TextPairs from './text-pairs.vue';
import PluginSelect from './plugin-select.vue';

// Async components
const CodeEditor = defineAsyncComponent(() =>
  	import('@/components/utility/code-editor/index.vue')
);

/**
 * Component map for setting types
 * @type {Object<string, Object>}
 */
export const componentMap = {
	'toggle': {
		component: AppToggle,
		defaultProps: {},
	},
	'select': {
		component: AppSelect,
		defaultProps: {},
	},
	'input': {
		component: AppInput,
		defaultProps: {},
	},
	'image-select': {
		component: ImageSelect,
		defaultProps: {},
	},
	'user-role-select': {
		component: UserRoleSelect,
		defaultProps: {},
	},
	'post-type-select': {
		component: PostTypeSelect,
		defaultProps: {},
	},
	'plugin-select': {
		component: PluginSelect,
		defaultProps: {},
	},
	'color-picker': {
		component: ColorPicker,
		defaultProps: {},
	},
	'code-editor': {
		component: CodeEditor,
		defaultProps: {},
	},
	'text-pairs': {
		component: TextPairs,
		defaultProps: {},
	},
};

/**
 * Get component for a setting type
 * @param {string} type - The setting type
 * @returns {Object|null} Component definition or null if not found
 */
export const getComponentForType = (type) => {
  	return componentMap[type] || null;
};