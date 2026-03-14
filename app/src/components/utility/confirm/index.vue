<script setup>
import { ref, nextTick, watchEffect } from "vue";
import Modal from "@/components/utility/modal/index.vue";
import AppIcon from "@/components/utility/icons/index.vue";
import uiButton from "@/components/utility/app-button/index.vue";

const popup = ref(null);

const title = ref(undefined);
const confirmBody = ref(undefined);
const message = ref(undefined);
const okButton = ref(undefined);
const cancelButton = ref("Cancel");
const icon = ref("report");
const resolvePromise = ref(undefined);
const rejectPromise = ref(undefined);

/**
 * Shows confirm dialog and sets options
 *
 * @param {Object} opts - the confirm options
 * @since 0.0.1
 */
const show = (opts = {}) => {
  title.value = opts.title;
  message.value = opts.message;
  okButton.value = opts.okButton;
  if (opts.icon) {
    icon.value = opts.icon;
  }
  if (opts.cancelButton) {
    cancelButton.value = opts.cancelButton;
  }
  // Once we set our config, we tell the popup modal to open
  popup.value.show();

  // Return promise so the caller can get results
  return new Promise((resolve, reject) => {
    resolvePromise.value = resolve;
    rejectPromise.value = reject;
  });
};

/**
 * Confirms and closes modal
 *
 * @since 0.0.1
 */
const confirm = () => {
  popup.value.close();
  resolvePromise.value(true);
};

/**
 * Cancels and closes modal
 *
 * @since 0.0.1
 */
const cancel = () => {
  popup.value.close();
  resolvePromise.value(false);
};

watchEffect(() => {
  if (confirmBody.value) {
    confirmBody.value.focus();
  }
});

/**
 * Exposes open and close methods
 */
defineExpose({
  show,
  cancel,
});
</script>

<template>
  <modal ref="popup">
    <div ref="confirmBody" @keydown.escape="cancel()" @keydown.enter="confirm()" class="flex flex-col focus:outline-0 w-[400px] p-8 gap-6" tabindex="1" autofocus>
      <div class="flex flex-row items-center place-content-between">
        <h2 class="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{{ title }}</h2>
        <uiButton type="transparent" @click="cancel()"><AppIcon icon="close" /></uiButton>
      </div>

      <div class="text-zinc-500 dark:text-zinc-400" v-html="message"></div>

      <div class="flex flex-row gap-3 items-center place-content-end mt-2">
        <uiButton @click.stop="cancel()" type="default">
          <div class="flex flex-row gap-3 items-center place-content-center">
            <span>{{ cancelButton }}</span>
            <span class="text-sm text-zinc-500">esc</span>
          </div>
        </uiButton>

        <uiButton @click.stop="confirm()" type="primary">
          <div class="flex flex-row gap-3 items-center place-content-center">
            <span>{{ okButton }}</span>
            <span class="text-sm text-zinc-500"><AppIcon icon="return" /></span>
          </div>
        </uiButton>
      </div>
    </div>
  </modal>
</template>
