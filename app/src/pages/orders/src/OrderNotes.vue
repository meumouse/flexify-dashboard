<script setup>
import { onMounted, ref } from 'vue';
import { FdButton, FdCard, FdConfirmDialog, FdSkeleton, FdSwitch, FdTextarea, FdTooltip } from '@/components/kit';
import AppIcon from '@/components/utility/icons/index.vue';
import { notify } from '@/assets/js/functions/notify.js';
import { useOrderHelpers } from './useOrderHelpers.js';

const props = defineProps({
  orderId: { type: Number, required: true },
});

const { wc, formatDate, relativeDate, safeHtml } = useOrderHelpers();

const notes = ref([]);
const loading = ref(true);
const saving = ref(false);
const content = ref('');
const customerNote = ref(false);
const confirmDialog = ref(null);

const load = async () => {
  loading.value = true;
  const response = await wc(`orders/${props.orderId}/notes`, { params: { type: 'any' } });
  notes.value = Array.isArray(response?.data) ? response.data : [];
  loading.value = false;
};

const noteTone = (note) => {
  if (note.customer_note) return { icon: 'email', classes: 'bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15', label: __('Note to customer', 'flexify-dashboard') };
  if (note.added_by_user) return { icon: 'person', classes: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400', label: __('Private note', 'flexify-dashboard') };
  return { icon: 'bolt', classes: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', label: __('System', 'flexify-dashboard') };
};

const addNote = async () => {
  if (!content.value.trim()) return;

  saving.value = true;
  const response = await wc(`orders/${props.orderId}/notes`, {
    type: 'POST',
    data: { note: content.value, customer_note: customerNote.value, added_by_user: true },
  });
  saving.value = false;

  if (!response?.data) return;

  notes.value = [response.data, ...notes.value];
  content.value = '';
  notify({ title: customerNote.value ? __('Note sent to customer', 'flexify-dashboard') : __('Note added', 'flexify-dashboard'), type: 'success' });
  customerNote.value = false;
};

const removeNote = async (note) => {
  const confirmed = await confirmDialog.value.show({
    title: __('Delete note?', 'flexify-dashboard'),
    message: __('This note will be permanently removed from the order.', 'flexify-dashboard'),
    confirmLabel: __('Delete', 'flexify-dashboard'),
    variant: 'danger',
  });

  if (!confirmed) return;

  const response = await wc(`orders/${props.orderId}/notes/${note.id}`, { type: 'DELETE', params: { force: 'true' } });

  if (!response) return;

  notes.value = notes.value.filter((item) => item.id !== note.id);
  notify({ title: __('Note deleted', 'flexify-dashboard'), type: 'success' });
};

defineExpose({ reload: load });

onMounted(load);
</script>

<template>
  <FdCard :title="__('Order notes', 'flexify-dashboard')" divided>
    <form class="mb-6 space-y-3" @submit.prevent="addNote">
      <FdTextarea v-model="content" :rows="3" :placeholder="__('Add a note about this order…', 'flexify-dashboard')" :aria-label="__('Note', 'flexify-dashboard')" />
      <div class="flex flex-wrap items-center justify-between gap-3">
        <FdSwitch v-model="customerNote" :label="__('Send to customer', 'flexify-dashboard')" />
        <FdButton type="submit" size="sm" :loading="saving" :disabled="!content.trim()">
          {{ customerNote ? __('Send note', 'flexify-dashboard') : __('Add note', 'flexify-dashboard') }}
        </FdButton>
      </div>
    </form>

    <div v-if="loading" class="space-y-4">
      <div v-for="index in 3" :key="index" class="flex gap-3">
        <FdSkeleton class="h-8 w-8 rounded-full" />
        <div class="flex-1 space-y-2">
          <FdSkeleton class="h-4 w-3/4" />
          <FdSkeleton class="h-3 w-1/3" />
        </div>
      </div>
    </div>

    <p v-else-if="!notes.length" class="text-center text-theme-sm text-gray-500 dark:text-gray-400">{{ __('No notes yet.', 'flexify-dashboard') }}</p>

    <ol v-else class="relative space-y-5">
      <li v-for="(note, index) in notes" :key="note.id" class="group relative flex gap-3">
        <span v-if="index < notes.length - 1" class="absolute start-4 top-9 -bottom-5 w-px bg-gray-200 dark:bg-gray-800" aria-hidden="true"></span>
        <FdTooltip :text="noteTone(note).label">
          <span :class="['relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full', noteTone(note).classes]">
            <AppIcon :icon="noteTone(note).icon" class="text-base" />
          </span>
        </FdTooltip>
        <div class="min-w-0 flex-1">
          <div class="fd-note-content break-words text-theme-sm text-gray-700 dark:text-gray-300" v-html="safeHtml(note.note)"></div>
          <p class="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
            <span :title="formatDate(note.date_created, true)">{{ relativeDate(note.date_created) }}</span>
            <template v-if="note.author && note.author !== 'system'"> · {{ note.author }}</template>
          </p>
        </div>
        <FdButton
          variant="ghost"
          size="xs"
          icon="delete"
          icon-only
          class="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          :aria-label="__('Delete note', 'flexify-dashboard')"
          @click="removeNote(note)"
        />
      </li>
    </ol>

    <FdConfirmDialog ref="confirmDialog" />
  </FdCard>
</template>

<style>
.fd-note-content a {
  color: rgb(var(--fd-accent-500));
}

.fd-note-content p {
  margin: 0;
}
</style>
