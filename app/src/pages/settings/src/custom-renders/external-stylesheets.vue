<script setup>
import { computed } from 'vue';
import AppInput from '@/components/utility/text-input/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import AppIcon from '@/components/utility/icons/index.vue';

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

const stylesheets = computed({
  get: () => {
    if (!Array.isArray(props.modelValue[props.setting.id])) {
      return [];
    }
    return props.modelValue[props.setting.id];
  },
  set: (value) => {
    emit('update:modelValue', {
      ...props.modelValue,
      [props.setting.id]: value,
    });
  },
});

const addStylesheet = () => {
  stylesheets.value = [...stylesheets.value, ''];
};

const removeStylesheet = (index) => {
  stylesheets.value = stylesheets.value.filter((_, i) => i !== index);
};

const updateStylesheet = (index, value) => {
  const updated = [...stylesheets.value];
  updated[index] = value;
  stylesheets.value = updated;
};
</script>

<template>
  <div class="col-span-2 flex flex flex-col place-content-start gap-3">
    <template v-for="(item, index) in stylesheets" :key="index">
      <div class="flex flex-row gap-3 items-center">
        <AppInput
          :model-value="item"
          @update:model-value="updateStylesheet(index, $event)"
          type="text"
          :placeholder="__('URL', 'flexify-dashboard')"
          class="max-w-[300px] grow"
        />
        <AppButton
          type="transparent"
          @click="removeStylesheet(index)"
        >
          <AppIcon icon="close" />
        </AppButton>
      </div>
    </template>

    <div class="flex flex-row items-start">
      <AppButton type="default" @click="addStylesheet">
        {{ __('Add new', 'flexify-dashboard') }}
      </AppButton>
    </div>
  </div>
</template>

