<script setup>
import { ref, onMounted, watchEffect, computed, useAttrs, defineModel, defineProps } from "vue";

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
const search = ref("");
const parent = ref(null);
const contextmenu = ref(null);
const props = defineProps(["options", "placeholder"]);
const userPagination = ref({ per_page: 10, page: 1, pages: 0, total: 0 });
const users = ref([]);
const roles = ref([]);
const toggleOptions = { users: { value: "users", label: __("Users", "flexify-dashboard") }, roles: { value: "roles", label: __("Roles", "flexify-dashboard") } };
const tab = ref("roles");

const showOptions = async (evt) => {
  contextmenu.value.show(evt, returnThisPos());
  await getUsers();
  getRoles();

  if (!Array.isArray(model.value)) {
    model.value = [];
  }
};

const getUsers = async () => {
  const args = { endpoint: "wp/v2/users", params: { ...userPagination.value, search: search.value } };
  const response = await lmnFetch(args);

  // Something went wrong
  if (!response) return;

  users.value = response.data;
  userPagination.value.pages = response.totalPages;
  userPagination.value.total = response.totalItems;
};

const getRoles = async () => {
  const args = { endpoint: "flexify-dashboard/v1/user-roles", params: {} };
  const response = await lmnFetch(args);

  // Something went wrong
  if (!response) return;

  roles.value = response.data;
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
  if (!Array.isArray(model.value)) {
    model.value = [];
    return false;
  }
  return model.value.find((user) => user.id == item.id);
};

const toggleUserItem = (item) => {
  if (isUserSelected(item)) {
    const index = model.value.findIndex((user) => user.id == item.id);
    model.value.splice(index, 1);
  } else {
    model.value.push({ id: item.id, value: item.slug, type: "user" });
  }
};

const isRoleSelected = (item) => {
  if (!Array.isArray(model.value)) {
    model.value = [];
    return false;
  }
  return model.value.find((role) => role.value == item.value);
};

const toggleRoleItem = (item) => {
  if (isRoleSelected(item)) {
    const index = model.value.findIndex((role) => role.value == item.value);
    model.value.splice(index, 1);
  } else {
    model.value.push({ id: "", value: item.value, type: "role" });
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

watchEffect(() => {
  if (!Array.isArray(model.value)) model.value = [];
});
</script>

<template>
  <div
    v-if="model"
    @click="showOptions"
    v-bind="attrs"
    ref="parent"
    class="px-2 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg w-full transition-all outline outline-transparent outline-offset-[-2px] focus:outline-brand-300 dark:focus:outline-brand-700 focus:shadow-xs text-sm col-span-2 flex flex-row gap-3 items-center"
  >
    <span v-if="model.length" class="grow">{{ `${model.length} ${__("Items selected", "flexify-dashboard")}` }}</span>
    <span v-else class="text-zinc-500 grow">{{ __("Select users or roles", "flexify-dashboard") }}</span>
    <AppButton type="transparent" v-if="model.length" @click.stop.prevent="model = []"><AppIcon icon="close" /></AppButton>
    <AppIcon icon="unfold" />
  </div>

  <ContextMenu ref="contextmenu">
    <div class="flex flex-col gap-3 w-[260px]">
      <AppToggle v-model="tab" :options="toggleOptions" />

      <!-- Search -->
      <div class="relative flex">
        <input
          v-model="search"
          class="px-2 py-2 pl-8 border border-zinc-200 dark:border-zinc-700 rounded-lg w-full transition-all outline outline-transparent outline-offset-[-2px] focus:outline-brand-300 dark:focus:outline-brand-700 focus:shadow-xs text-sm dark:bg-transparent"
          :placeholder="__('Search')"
          @keyup.enter="getUsers"
        />

        <!-- Icon-->
        <div class="absolute top-0 left-0 h-full flex flex-col place-content-center px-2 py-1">
          <AppIcon icon="search" class="text-lg text-zinc-400" />
        </div>
      </div>

      <!-- Loop users -->
      <div v-if="tab === 'users'" class="flex flex-col max-h-80 overflow-auto">
        <template v-for="option in users">
          <div class="flex flex-row items-center gap-3 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors rounded-lg cursor-pointer" @click="toggleUserItem(option)">
            <AppCheckBox :checked="isUserSelected(option) ? true : false" />
            <div>{{ option.slug }}</div>
          </div>
        </template>
      </div>

      <!-- Loop roles -->
      <div v-if="tab === 'roles'" class="flex flex-col max-h-80 overflow-auto">
        <template v-for="option in roles">
          <div class="flex flex-row items-center gap-3 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors rounded-lg cursor-pointer" @click="toggleRoleItem(option)">
            <AppCheckBox :checked="isRoleSelected(option) ? true : false" />
            <div>{{ option.value }}</div>
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
