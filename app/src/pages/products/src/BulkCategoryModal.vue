<script setup>
import { ref, watch } from 'vue';
import { FdButton, FdModal, FdSelect } from '@/components/kit';

const open = defineModel('open', { type: Boolean, default: false });

const props = defineProps({
  mode: { type: String, default: 'add' },
  options: { type: Array, default: () => [] },
  count: { type: Number, default: 0 },
});

const emit = defineEmits(['apply']);
const category = ref('');

watch(open, (value) => {
  if (value) category.value = '';
});

const apply = () => {
  if (!category.value) return;
  emit('apply', Number(category.value));
  open.value = false;
};
</script>

<template>
  <FdModal
    v-model:open="open"
    size="sm"
    :title="mode === 'add' ? __('Add category', 'flexify-dashboard') : __('Remove category', 'flexify-dashboard')"
    :description="sprintf(__('%d selected product(s).', 'flexify-dashboard'), count)"
  >
    <FdSelect v-model="category" :label="__('Category', 'flexify-dashboard')" :placeholder="__('Select a category', 'flexify-dashboard')" :options="options" />
    <template #footer>
      <FdButton variant="outline" @click="open = false">{{ __('Cancel', 'flexify-dashboard') }}</FdButton>
      <FdButton :variant="props.mode === 'add' ? 'primary' : 'danger'" :disabled="!category" @click="apply">
        {{ mode === 'add' ? __('Add category', 'flexify-dashboard') : __('Remove category', 'flexify-dashboard') }}
      </FdButton>
    </template>
  </FdModal>
</template>
