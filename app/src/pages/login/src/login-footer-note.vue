<script setup>
defineProps({
  href: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <div class="mt-5 text-[0.97rem] text-gray-600 dark:text-gray-400">
    <p class="m-0">
      Don't have an account?
      <a
        :href="href"
        class="text-[0.97rem] font-medium text-[#008aff] no-underline transition-colors duration-150 hover:text-[#0072ff]"
      >
        Sign Up
      </a>
    </p>
  </div>
</template>
