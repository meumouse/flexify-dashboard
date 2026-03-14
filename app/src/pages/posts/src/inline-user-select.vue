<script setup>
import { ref, onMounted, watchEffect, computed, useAttrs, defineModel, defineProps, defineEmits } from "vue";

import { inSearch } from "@/assets/js/functions/inSearch.js";

// Emits and props
const attrs = useAttrs();
import { lmnFetch } from "@/assets/js/functions/lmnFetch.js";

// Import comps
import ContextMenu from "@/components/utility/context-menu/index.vue";
import AppIcon from "@/components/utility/icons/index.vue";
import AppInput from "@/components/utility/text-input/index.vue";
import AppCheckBox from "@/components/utility/checkbox-basic/index.vue";
import AppToggle from "@/components/utility/toggle/index.vue";
import AppButton from "@/components/utility/app-button/index.vue";

// Setup refs
const model = defineModel();
const emit = defineEmits(["updated"]);
const loading = ref(false);
const search = ref("");
const parent = ref(null);
const contextmenu = ref(null);
const props = defineProps(["post"]);
const userPagination = ref({ per_page: 10, page: 1, pages: 0, total: 0 });
const users = ref([]);
const roles = ref([]);
const toggleOptions = { users: { value: "users", label: __("Users", "flexify-dashboard") }, roles: { value: "roles", label: __("Roles", "flexify-dashboard") } };
const tab = ref("roles");

const showOptions = async (evt) => {
  // Only allow editing if user has access
  if (!props.post.is_editable) return;

  contextmenu.value.show(evt, returnThisPos());
  await getUsers();
};

const getUsers = async () => {
  loading.value = true;

  const args = { endpoint: "wp/v2/users", params: { ...userPagination.value, search: search.value } };
  const response = await lmnFetch(args);

  loading.value = false;

  // Something went wrong
  if (!response) return;

  users.value = response.data;
  userPagination.value.pages = response.totalPages;
  userPagination.value.total = response.totalItems;
};

/**
 * Returns postition of current target
 *
 * @since 0.0.1
 */
const returnThisPos = (evt) => {
  const target = parent.value;
  const rect = target.getBoundingClientRect();
  return { clientY: rect.bottom + 10, clientX: rect.left };
};

const isUserSelected = (item) => {
  return model.value.id == item.id;
};

const toggleUserItem = (item) => {
  if (isUserSelected(item)) {
    model.value = {};
  } else {
    model.value = { id: item.id, name: item.name || item.slug, gravatar: item.avatar_urls[24] || item.avatar_urls[38] || item.avatar_urls[96] };
    emit("updated");
  }
};

const backPage = () => {
  userPagination.value.page--;
  getUsers();
};
const nextPage = () => {
  userPagination.value.page++;
  getUsers();
};
</script>

<template>
  <div
    @click.stop="showOptions"
    v-bind="attrs"
    ref="parent"
    class="flex flex-row items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
  >
    <div
      class="w-5 aspect-square bg-zinc-700 dark:bg-indigo-700 text-white rounded-full font-semibold flex items-center justify-center shrink-0 relative overflow-hidden border border-zinc-200 dark:border-zinc-700"
    >
      <span class="lowercase relative text-sm font-medium leading-none mb-0.5">{{ model.name ? model.name.charAt(0) : "u" }}</span>
      <img v-if="model.gravatar" :src="model.gravatar" class="absolute w-full h-full" />
    </div>
    <span class="truncate" v-html="model.name || __('Unknown user', 'flexify-dashboard')"></span>
  </div>

  <ContextMenu ref="contextmenu">
    <div class="flex flex-col gap-3 w-[260px]">
      <div class="font-semibold mb-1">{{ __("Update author", "flexify-dashboard") }}</div>
      <!-- Search -->
      <div class="relative flex">
        <input
          v-model="search"
          class="px-2 py-2 pl-8 border border-zinc-200 dark:border-zinc-700 rounded-lg w-full transition-all outline outline-transparent outline-offset-[-2px] focus:outline-indigo-300 dark:focus:outline-indigo-700 focus:shadow-xs text-sm dark:bg-transparent"
          :placeholder="__('Search', 'flexify-dashboard')"
          @keyup.enter="getUsers"
        />

        <!-- Icon-->
        <div class="absolute top-0 left-0 h-full flex flex-col place-content-center px-2 py-1">
          <AppIcon icon="search" class="text-lg text-zinc-400" />
        </div>
      </div>

      <!-- Loop users -->
      <div class="flex flex-col max-h-80 overflow-auto">
        <div class="flex flex-col gap-2 animate-pulse p-2" v-if="loading">
          <div class="rounded-lg h-4 w-2/3 bg-zinc-100 dark:bg-zinc-800"></div>
          <div class="rounded-lg h-4 w-3/4 bg-zinc-100 dark:bg-zinc-800"></div>
          <div class="rounded-lg h-4 w-1/2 bg-zinc-100 dark:bg-zinc-800"></div>
          <div class="rounded-lg h-4 w-2/3 bg-zinc-100 dark:bg-zinc-800"></div>
        </div>

        <template v-for="option in users" v-else>
          <div class="flex flex-row items-center gap-3 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors rounded-lg cursor-pointer" @click="toggleUserItem(option)">
            <AppCheckBox :checked="isUserSelected(option) ? true : false" />
            <div>{{ option.slug }}</div>
          </div>
        </template>
      </div>

      <!-- Pagination -->
      <div class="flex flex-row place-content-end items-center gap-1" v-if="tab == 'users'">
        <AppButton type="default" :disabled="userPagination.page == 1" @click="backPage"><AppIcon icon="chevron_left" /></AppButton>
        <AppButton type="default" :disabled="userPagination.page >= userPagination.pages" @click="nextPage"><AppIcon icon="chevron_right" /></AppButton>
      </div>
    </div>
  </ContextMenu>
</template>
