Copy

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import AppIcon from '@/components/utility/icons/index.vue';

/**
 * TagInput Component
 *
 * A tag input component that displays tags as chips inside the input field
 * with autocomplete dropdown and backspace removal functionality.
 */

const props = defineProps({
  /**
   * Array of selected tags
   * Each tag should have { id, name, slug } structure
   */
  modelValue: {
    type: Array,
    default: () => [],
  },
  /**
   * Array of available tags for autocomplete
   * Each tag should have { id, name, slug, count? } structure
   */
  availableTags: {
    type: Array,
    default: () => [],
  },
  /**
   * Placeholder text for the input
   */
  placeholder: {
    type: String,
    default: 'Add tags...',
  },
  /**
   * Whether the component is disabled
   */
  disabled: {
    type: Boolean,
    default: false,
  },
  /**
   * Whether to allow creating new tags
   */
  allowCreate: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['update:modelValue', 'add', 'remove', 'create']);

// Refs
const inputRef = ref(null);
const containerRef = ref(null);
const dropdownRef = ref(null);
const inputValue = ref('');
const showDropdown = ref(false);
const highlightedIndex = ref(-1);
const isComposing = ref(false);

/**
 * Filtered tags for autocomplete dropdown
 */
const filteredTags = computed(() => {
  if (!inputValue.value.trim()) {
    return props.availableTags.filter(
      (tag) => !props.modelValue.some((t) => t.id === tag.id)
    );
  }

  const query = inputValue.value.toLowerCase();
  return props.availableTags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(query) &&
      !props.modelValue.some((t) => t.id === tag.id)
  );
});

/**
 * Check if input should show (when there's space or no tags)
 */
const showInput = computed(() => {
  return !props.disabled;
});

/**
 * Handle input focus
 */
const handleFocus = () => {
  if (!props.disabled) {
    showDropdown.value =
      filteredTags.value.length > 0 || inputValue.value.trim();
  }
};

/**
 * Handle input blur - only close if focus moved outside component
 */
const handleBlur = (event) => {
  // Check if the new focus target is within our component
  const relatedTarget = event.relatedTarget;

  // If clicking within dropdown or container, don't close
  if (
    relatedTarget &&
    (dropdownRef.value?.contains(relatedTarget) ||
      containerRef.value?.contains(relatedTarget))
  ) {
    return;
  }

  // Close dropdown when focus truly leaves the component
  showDropdown.value = false;
  highlightedIndex.value = -1;
};

/**
 * Handle input keydown
 */
const handleKeyDown = (event) => {
  if (props.disabled) return;

  // Handle backspace to remove last tag
  if (
    event.key === 'Backspace' &&
    !inputValue.value &&
    props.modelValue.length > 0
  ) {
    event.preventDefault();
    removeTag(props.modelValue[props.modelValue.length - 1].id);
    return;
  }

  // Handle escape to close dropdown
  if (event.key === 'Escape') {
    showDropdown.value = false;
    highlightedIndex.value = -1;
    inputRef.value?.blur();
    return;
  }

  // Handle arrow keys for navigation
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (showDropdown.value && filteredTags.value.length > 0) {
      highlightedIndex.value = Math.min(
        highlightedIndex.value + 1,
        filteredTags.value.length - 1
      );
      scrollToHighlighted();
    } else if (!showDropdown.value) {
      showDropdown.value = true;
      highlightedIndex.value = 0;
    }
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (showDropdown.value) {
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1);
      scrollToHighlighted();
    }
    return;
  }

  // Handle enter to select highlighted tag or create new
  if (event.key === 'Enter' && !isComposing.value) {
    event.preventDefault();
    if (
      highlightedIndex.value >= 0 &&
      filteredTags.value[highlightedIndex.value]
    ) {
      addTag(filteredTags.value[highlightedIndex.value]);
    } else if (inputValue.value.trim() && props.allowCreate) {
      createNewTag(inputValue.value.trim());
    }
    return;
  }

  // Handle comma to create/add tag
  if (event.key === ',' && !isComposing.value) {
    event.preventDefault();
    if (inputValue.value.trim() && props.allowCreate) {
      createNewTag(inputValue.value.trim());
    }
    return;
  }
};

/**
 * Handle composition start (for IME input)
 */
const handleCompositionStart = () => {
  isComposing.value = true;
};

/**
 * Handle composition end (for IME input)
 */
const handleCompositionEnd = () => {
  isComposing.value = false;
};

/**
 * Handle input change
 */
const handleInput = () => {
  if (inputValue.value.trim()) {
    showDropdown.value = true;
    highlightedIndex.value = -1;
  } else {
    showDropdown.value = filteredTags.value.length > 0;
  }
};

/**
 * Add a tag
 */
const addTag = (tag) => {
  // Check if tag already exists
  if (props.modelValue.some((t) => t.id === tag.id)) {
    return;
  }

  const newTags = [...props.modelValue, tag];
  emit('update:modelValue', newTags);
  emit('add', tag);
  inputValue.value = '';
  showDropdown.value = false;
  highlightedIndex.value = -1;

  // Keep focus on input
  nextTick(() => {
    inputRef.value?.focus();
  });
};

/**
 * Remove a tag
 */
const removeTag = (tagId) => {
  const newTags = props.modelValue.filter((t) => t.id !== tagId);
  emit('update:modelValue', newTags);
  const removedTag = props.modelValue.find((t) => t.id === tagId);
  if (removedTag) {
    emit('remove', removedTag);
  }

  // Keep focus on input
  nextTick(() => {
    inputRef.value?.focus();
  });
};

/**
 * Create a new tag
 */
const createNewTag = (tagName) => {
  if (!tagName.trim() || !props.allowCreate) return;

  // Check if tag already exists by name
  const existingTag = props.availableTags.find(
    (t) => t.name.toLowerCase() === tagName.toLowerCase()
  );

  if (existingTag) {
    addTag(existingTag);
  } else {
    // Emit create event - parent should handle creating the tag
    emit('create', tagName.trim());
    inputValue.value = '';
    showDropdown.value = false;
    highlightedIndex.value = -1;
  }
};

/**
 * Handle dropdown item click
 */
const handleDropdownClick = (tag, event) => {
  event.preventDefault();
  event.stopPropagation();
  addTag(tag);
};

/**
 * Handle create tag click
 */
const handleCreateClick = (event) => {
  event.preventDefault();
  event.stopPropagation();
  createNewTag(inputValue.value.trim());
};

/**
 * Scroll to highlighted item in dropdown
 */
const scrollToHighlighted = () => {
  nextTick(() => {
    const dropdown = dropdownRef.value;
    const items = dropdown?.querySelectorAll('button');
    const highlighted = items?.[highlightedIndex.value];
    if (highlighted && dropdown) {
      highlighted.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  });
};

/**
 * Watch for changes to availableTags to update dropdown
 */
watch(
  () => props.availableTags,
  () => {
    if (inputValue.value.trim() && filteredTags.value.length > 0) {
      showDropdown.value = true;
    }
  }
);

/**
 * Watch for changes to modelValue to update dropdown
 */
watch(
  () => props.modelValue,
  () => {
    if (inputValue.value.trim()) {
      showDropdown.value = filteredTags.value.length > 0;
    }
  }
);

/**
 * Handle click outside to close dropdown
 */
const handleClickOutside = (event) => {
  if (
    containerRef.value &&
    !containerRef.value.contains(event.target) &&
    dropdownRef.value &&
    !dropdownRef.value.contains(event.target)
  ) {
    showDropdown.value = false;
    highlightedIndex.value = -1;
  }
};

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});
</script>

<template>
  <div ref="containerRef" class="relative w-full">
    <!-- Input Container with Tags -->
    <div
      class="flex flex-wrap items-center gap-1.5 min-h-[42px] px-2 py-1.5 bg-transparent border border-zinc-200 dark:border-zinc-700/40 rounded-lg w-full transition-all outline outline-transparent outline-offset-[-2px] focus-within:outline-indigo-300 dark:focus-within:outline-indigo-700 focus-within:shadow-xs text-sm"
      :class="{
        'opacity-50 cursor-not-allowed': disabled,
        'bg-zinc-50 dark:bg-zinc-900/50': !disabled,
      }"
      @click="inputRef?.focus()"
    >
      <!-- Tags as Chips -->
      <div
        v-for="tag in modelValue"
        :key="tag.id"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md text-xs text-zinc-700 dark:text-zinc-300 group"
      >
        <span>{{ tag.name }}</span>
        <button
          v-if="!disabled"
          @click.stop="removeTag(tag.id)"
          class="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors ml-0.5"
          :title="__('Remove tag', 'flexify-dashboard')"
          type="button"
        >
          <AppIcon icon="close" class="text-xs" />
        </button>
      </div>

      <!-- Input Field -->
      <input
        v-if="showInput"
        ref="inputRef"
        v-model="inputValue"
        type="text"
        :placeholder="modelValue.length === 0 ? placeholder : ''"
        :disabled="disabled"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeyDown"
        @input="handleInput"
        @compositionstart="handleCompositionStart"
        @compositionend="handleCompositionEnd"
        class="flex-1 min-w-[120px] bg-transparent border-0 outline-0 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
      />
    </div>

    <!-- Autocomplete Dropdown -->
    <Transition
      enter-active-class="transition-all duration-150 ease-out"
      enter-from-class="opacity-0 scale-95 translate-y-[-4px]"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition-all duration-100 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-95 translate-y-[-4px]"
    >
      <div
        v-if="showDropdown && !disabled"
        ref="dropdownRef"
        class="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg max-h-64 overflow-auto tag-dropdown"
        @mousedown.prevent
      >
        <!-- Available Tags -->
        <button
          v-for="(tag, index) in filteredTags"
          :key="tag.id"
          @click="handleDropdownClick(tag, $event)"
          type="button"
          tabindex="-1"
          :class="[
            'w-full px-3 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex items-center justify-between',
            highlightedIndex === index ? 'bg-zinc-100 dark:bg-zinc-700' : '',
          ]"
        >
          <span>{{ tag.name }}</span>
          <span
            v-if="tag.count !== undefined"
            class="text-[10px] text-zinc-500 dark:text-zinc-400"
          >
            ({{ tag.count }})
          </span>
        </button>

        <!-- Create New Tag Option -->
        <button
          v-if="
            inputValue.trim() &&
            allowCreate &&
            !filteredTags.some(
              (t) => t.name.toLowerCase() === inputValue.trim().toLowerCase()
            )
          "
          @click="handleCreateClick($event)"
          type="button"
          tabindex="-1"
          class="w-full px-3 py-2 text-left text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center gap-2 border-t border-zinc-200 dark:border-zinc-700"
        >
          <AppIcon icon="add" class="text-sm" />
          <span
            >{{ __('Create tag', 'flexify-dashboard') }}: "{{ inputValue.trim() }}"</span
          >
        </button>

        <!-- No Results -->
        <div
          v-if="filteredTags.length === 0 && !inputValue.trim()"
          class="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400 text-center"
        >
          {{ __('No tags available', 'flexify-dashboard') }}
        </div>
      </div>
    </Transition>
  </div>
</template>
