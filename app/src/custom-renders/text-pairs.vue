<script setup>
import { computed } from 'vue';
import TextPairs from '../text-pairs.vue';

const props = defineProps({
  setting: {
    type: Object,
    required: true,
  },
  modelValue: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['update:modelValue']);

const textReplacements = computed({
  get: () => props.modelValue[props.setting.id],
  set: (value) => {
    emit('update:modelValue', {
      ...props.modelValue,
      [props.setting.id]: value,
    });
  },
});
</script>

<template>
  <div class="col-span-2 flex flex flex-col place-content-start gap-3">
    <TextPairs v-model="textReplacements" />
  </div>
</template>

