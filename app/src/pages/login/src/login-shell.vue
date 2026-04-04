<template>
  <div class="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
    <div class="mx-auto grid min-h-screen w-full grid-cols-1 lg:grid-cols-2">
      <slot name="form" />
      <slot name="aside" />
    </div>
  </div>
</template>
