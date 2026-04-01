<script setup>
import { ref, computed, watchEffect } from 'vue';

const loading = ref(true);
const toolbarnode = ref(null);

// get app store
import { useAppStore } from '@/store/app/app.js';
const appStore = useAppStore();

/**
 * Moves WordPress admin bar into custom toolbar
 */
const moveToolbar = () => {
	loading.value = true;

	if (!toolbarnode.value) {
		loading.value = false;

		return;
	}

	// Find the original WordPress admin bar and ignore our custom container.
	let wpAdminBar = document.body.querySelector('#wpadminbar:not(.fd-wp-admin-bar)');

	if (!wpAdminBar) {
		loading.value = false;

		return;
	}

	const wpToolbar = wpAdminBar.querySelector('#wp-toolbar');

	if (!wpToolbar) {
		loading.value = false;

		return;
	}

	// Remove unwanted items before moving the toolbar
	const itemsToRemove = [
		'#wp-admin-bar-my-account',
		'#wp-admin-bar-wp-logo',
		'#wp-admin-bar-site-name',
		'#wp-admin-bar-menu-toggle',
	];

	itemsToRemove.forEach((selector) => {
		const item = wpToolbar.querySelector(selector);

		if (item) {
			item.remove();
		}
	});

	// Clear existing content and move the full admin bar into our custom toolbar.
	// This keeps WordPress core #wpadminbar selectors working for plugins.
	if (wpAdminBar.parentNode !== toolbarnode.value) {
		toolbarnode.value.replaceChildren();
		toolbarnode.value.appendChild(wpAdminBar);
	}

	loading.value = false;
};

const returnIconOverrides = computed(() => {
  let style = '';

  const overrides = [
    ['wp-admin-bar-comments', 'chat'],
    ['wp-admin-bar-updates', 'update'],
    ['wp-admin-bar-new-content', 'library_add'],
    ['wp-admin-bar-customize', 'palette'],
  ];

  const base = appStore.state.pluginBase;

  for (let override of overrides) {
    const iconurl = `${base}assets/icons/${override[1]}.svg`;

    style += `
	  #${override[0]} .ab-icon::before{
		content: '';
		height:1.2rem;
		width:1.2rem;
		min-height:1.2rem;
		min-width:1.2rem;
		background-color:currentColor;
		-webkit-mask: url(${iconurl}) no-repeat center;
		-webkit-mask-size: contain;
		mask: url(${iconurl}) no-repeat center;
		mask-size: contain;
		line-height: 1rem;
        display: block;
	  }`;
  }

  style += `
  #wp-admin-bar-customize, #wp-admin-bar-edit{
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  #wp-admin-bar-customize::before, #wp-admin-bar-edit::before{
    content: '';
    height:1.2rem;
    width:1.2rem;
    min-height:1.2rem;
    min-width:1.2rem;
    background-color:currentColor;
    -webkit-mask: url(${base}assets/icons/palette.svg) no-repeat center;
    -webkit-mask-size: contain;
    mask: url(${base}assets/icons/palette.svg) no-repeat center;
    mask-size: contain;
    line-height: 1rem;
    display: block;
    color: rgb(var(--fd-base-500) / var(--tw-text-opacity));
  }
  #wp-admin-bar-edit::before{
    -webkit-mask: url(${base}assets/icons/edit.svg) no-repeat center;
    mask: url(${base}assets/icons/edit.svg) no-repeat center;
  }`;

  return style;
});

const stop = watchEffect(() => {
  if (!toolbarnode.value) return;

  // Move toolbar immediately
  moveToolbar();

  // Run slightly later to allow for other scripts to update toolbar items
  setTimeout(() => {
    moveToolbar();
  }, 500);

  stop();
});
</script>

<template>
	<div class="">
		<div class="flex flex-row gap-5 items-center fd-wp-admin-bar font-sans" ref="toolbarnode" id="fd-wpadminbar"></div>
		<component is="style"> {{ returnIconOverrides }}</component>
	</div>
</template>

<style>
@reference "tailwindcss";

#wp-admin-bar-my-account,
#wp-admin-bar-wp-logo,
#wp-admin-bar-site-name {
  	display: none;
}

#fd-wpadminbar #wpadminbar {
  	@apply bg-transparent h-auto min-w-0 w-auto relative;
}

#fd-wpadminbar #wp-toolbar {
  	@apply flex flex-row items-center gap-2;
}

#wp-admin-bar-root-default {
  	@apply flex flex-row items-center;
}

#fd-wpadminbar ul[role='menu'] li > .ab-item,
#fd-wpadminbar ul[role='menu'] li > .ab-empty-item {
	@apply px-2 py-1 rounded-lg transition-all relative cursor-pointer;
}

#fd-wpadminbar #wpadminbar .ab-sub-wrapper {
	@apply mt-2 p-2 rounded-2xl border border-zinc-200 bg-white shadow-lg;
	min-width: 200px;
}

.dark #fd-wpadminbar #wpadminbar .ab-sub-wrapper,
body.dark #fd-wpadminbar #wpadminbar .ab-sub-wrapper {
	@apply border-zinc-700 bg-slate-700;
}

#fd-wpadminbar #wpadminbar .ab-sub-wrapper .ab-submenu {
	@apply flex flex-col gap-0.5;
}

#fd-wpadminbar #wpadminbar .ab-sub-wrapper .ab-submenu li {
	@apply p-0 rounded-xl;
}

#fd-wpadminbar #wpadminbar .ab-sub-wrapper .ab-submenu li > .ab-item,
#fd-wpadminbar #wpadminbar .ab-sub-wrapper .ab-submenu li > .ab-empty-item {
	@apply flex items-center rounded-xl px-3 py-2 text-sm font-medium leading-5;
	color: #1c2434 !important;
	min-height: 40px;
}

#fd-wpadminbar #wpadminbar .ab-sub-wrapper .ab-submenu li:hover > .ab-item,
#fd-wpadminbar #wpadminbar .ab-sub-wrapper .ab-submenu li:hover > .ab-empty-item,
#fd-wpadminbar #wpadminbar .ab-sub-wrapper .ab-submenu li > .ab-item:focus,
#fd-wpadminbar #wpadminbar .ab-sub-wrapper .ab-submenu li > .ab-empty-item:focus {
	@apply bg-zinc-100;
}

.dark #fd-wpadminbar #wpadminbar .ab-sub-wrapper .ab-submenu li > .ab-item,
.dark #fd-wpadminbar #wpadminbar .ab-sub-wrapper .ab-submenu li > .ab-empty-item,
body.dark #fd-wpadminbar #wpadminbar .ab-sub-wrapper .ab-submenu li > .ab-item,
body.dark #fd-wpadminbar #wpadminbar .ab-sub-wrapper .ab-submenu li > .ab-empty-item {
	color: #ffffff !important;
}

.dark #fd-wpadminbar #wpadminbar .ab-sub-wrapper .ab-submenu li:hover > .ab-item,
.dark #fd-wpadminbar #wpadminbar .ab-sub-wrapper .ab-submenu li:hover > .ab-empty-item,
.dark #fd-wpadminbar #wpadminbar .ab-sub-wrapper .ab-submenu li > .ab-item:focus,
.dark #fd-wpadminbar #wpadminbar .ab-sub-wrapper .ab-submenu li > .ab-empty-item:focus,
body.dark #fd-wpadminbar #wpadminbar .ab-sub-wrapper .ab-submenu li:hover > .ab-item,
body.dark #fd-wpadminbar #wpadminbar .ab-sub-wrapper .ab-submenu li:hover > .ab-empty-item,
body.dark #fd-wpadminbar #wpadminbar .ab-sub-wrapper .ab-submenu li > .ab-item:focus,
body.dark #fd-wpadminbar #wpadminbar .ab-sub-wrapper .ab-submenu li > .ab-empty-item:focus {
	@apply bg-slate-600;
}
</style>
