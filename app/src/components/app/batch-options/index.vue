<script setup>
import { ref, computed, defineProps, defineEmits, defineModel, useSlots } from "vue";


import AppButton from "@/components/utility/app-button/index.vue";
import AppIcon from "@/components/utility/icons/index.vue";
import ContextMenu from "@/components/utility/context-menu/index.vue";
import Confirm from "@/components/utility/confirm/index.vue";

// Functions
import { lmnFetch } from "@/assets/js/functions/lmnFetch.js";
import { notify } from "@/assets/js/functions/notify.js";

const contextmenu = ref(null);
const slots = useSlots();
const statuses = ref([]);
const newStatus = ref(null);
const selected = defineModel();
const emit = defineEmits(["updated"]);
const confirm = ref(null);
const props = defineProps(["route"]);
const trigger = ref(null);

const openActionsList = async (evt) => {
  contextmenu.value.show(evt, returnThisPos());
};

/**
 * Returns postition of current target
 *
 * @since 0.0.1
 */
const returnThisPos = (evt) => {
  const target = trigger.value;
  const rect = target.getBoundingClientRect();
  return { clientY: rect.bottom + 10, clientX: rect.left };
};

const batchDelete = async (evt) => {
  // Confirm user intent
  const userResponse = await confirm.value.show({
    title: __("Are you sure?", "flexify-dashboard"),
    message: __("Are you sure you want to delete these items? This action cannot be undone.", "flexify-dashboard"),
    okButton: __("Yes delete them", "flexify-dashboard"),
  });

  // Bailed by user
  if (!userResponse) return;

  contextmenu.value.close();

  for (let selectedItem of selected.value) {
    const args = { endpoint: `${props.route}/${selectedItem}`, params: { force: true }, type: "DELETE" };
    const response = await lmnFetch(args);
  }

  notify({ type: "success", title: __("Selection deleted", "flexify-dashboard") });

  emit("updated");

  selected.value = [];
};
</script>

<template>
  <div ref="trigger">
    <AppButton type="default" @click="openActionsList" class="text-sm">
      <div class="flex flex-row gap-2 items-center">
        <AppIcon icon="stacks" />
        <span>{{ __("Bulk options", "flexify-dashboard") }}</span>
      </div>
    </AppButton>
  </div>
  <ContextMenu ref="contextmenu">
    <div class="flex flex-col w-60 gap-3 p-2">
      <slot />
      <div class="border-t border-zinc-200 dark:border-zinc-700" v-if="slots.default"></div>

      <AppButton type="danger" @click="batchDelete">
        <span>{{ __("Delete selected", "flexify-dashboard") }}</span>
      </AppButton>
    </div>
  </ContextMenu>
  <Confirm ref="confirm" />
</template>
