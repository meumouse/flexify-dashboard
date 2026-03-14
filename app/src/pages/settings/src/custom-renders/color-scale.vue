<script setup>
import { computed } from 'vue';
import ColorPicker from '@/components/utility/color-select/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';

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

const colorKey = computed(() => props.setting.customProps.colorKey);
const scaleKey = computed(() => props.setting.customProps.scaleKey);
const scaleLabel = computed(() => props.setting.customProps.scaleLabel);

const baseColor = computed({
  get: () => props.modelValue[colorKey.value],
  set: (value) => {
    emit('update:modelValue', {
      ...props.modelValue,
      [colorKey.value]: value,
    });
  },
});

const colorScale = computed({
  get: () => props.modelValue[scaleKey.value] || [],
  set: (value) => {
    emit('update:modelValue', {
      ...props.modelValue,
      [scaleKey.value]: value,
    });
  },
});

const clearColors = () => {
  emit('update:modelValue', {
    ...props.modelValue,
    [scaleKey.value]: [],
    [colorKey.value]: '',
  });
};
</script>

<template>
  <div class="col-span-2">
    <div class="max-w-[400px] flex flex-col gap-1">
      <div class="grid grid-cols-3 gap-3">
        <span class="flex flex-col place-content-center">{{
          scaleLabel
        }}</span>
        <ColorPicker v-model="baseColor" class="col-span-2" />
      </div>

            <template v-for="(color, index) in colorScale" :key="index">
              <div class="grid grid-cols-3 gap-3">
                <span class="flex flex-col place-content-center">{{
                  color.step
                }}</span>
                <ColorPicker
                  :model-value="color.color"
                  @update:model-value="(val) => {
                    const updated = [...colorScale];
                    updated[index] = { ...updated[index], color: val };
                    colorScale = updated;
                  }"
                  class="col-span-2"
                />
              </div>
            </template>

      <AppButton
        v-if="colorScale?.length"
        type="warning"
        @click="clearColors"
        class="mt-3"
      >
        {{ __('Clear custom properties', 'flexify-dashboard') }}
      </AppButton>
    </div>
  </div>
</template>

