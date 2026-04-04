<script setup>
const model = defineModel({
  type: Boolean,
  default: false,
});

defineProps({
  id: {
    type: String,
    default: 'fd-login-checkbox',
  },
  inputName: {
    type: String,
    required: true,
  },
  inputValue: {
    type: String,
    default: '1',
  },
  label: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <label
    :for="id"
    class="flex cursor-pointer items-center text-sm font-normal text-gray-700 select-none dark:text-gray-400"
  >
    <div class="relative">
      <input
        :id="id"
        v-model="model"
        type="checkbox"
        :name="inputName"
        :value="inputValue"
        class="peer sr-only"
        :checked="model"
      />
      <div
        class="mr-3 flex h-5 w-5 items-center justify-center rounded-md border-[1.25px] border-gray-300 bg-white transition-[border-color,background-color,box-shadow] duration-150 peer-checked:border-brand-500 peer-checked:bg-brand-500 peer-checked:shadow-[0_0_0_3px_rgba(0,138,255,0.14)] peer-focus-visible:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:peer-checked:border-brand-500 dark:peer-checked:bg-brand-500"
      >
        <span
          class="transition-opacity duration-150"
          :class="model ? 'opacity-100' : 'opacity-0'"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            class="text-white"
            aria-hidden="true"
          >
            <path
              d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
              stroke="currentColor"
              stroke-width="1.94437"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </div>
    </div>
    {{ label }}
  </label>
</template>
