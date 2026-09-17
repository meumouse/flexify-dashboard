<template>
  <div class="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
    <div class="mx-auto grid min-h-screen w-full grid-cols-1 lg:grid-cols-2">
      <slot name="form" />
      <slot name="aside" />
    </div>
  </div>
</template>
