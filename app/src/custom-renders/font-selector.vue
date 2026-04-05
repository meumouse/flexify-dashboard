<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import AppInput from '@/components/utility/text-input/index.vue';
import AppButton from '@/components/utility/app-button/index.vue';
import AppIcon from '@/components/utility/icons/index.vue';
import MediaLibrary from '@/components/utility/media-library-v2/index.vue';

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

// Popular Google Fonts list with categories
const popularGoogleFonts = [
  // Sans-serif - Modern & Clean
  { value: 'Inter', label: 'Inter', category: 'Sans-serif' },
  { value: 'Roboto', label: 'Roboto', category: 'Sans-serif' },
  { value: 'Open Sans', label: 'Open Sans', category: 'Sans-serif' },
  { value: 'Lato', label: 'Lato', category: 'Sans-serif' },
  { value: 'Montserrat', label: 'Montserrat', category: 'Sans-serif' },
  { value: 'Poppins', label: 'Poppins', category: 'Sans-serif' },
  { value: 'Source Sans 3', label: 'Source Sans 3', category: 'Sans-serif' },
  { value: 'Nunito', label: 'Nunito', category: 'Sans-serif' },
  { value: 'Raleway', label: 'Raleway', category: 'Sans-serif' },
  { value: 'Ubuntu', label: 'Ubuntu', category: 'Sans-serif' },
  { value: 'Rubik', label: 'Rubik', category: 'Sans-serif' },
  { value: 'Work Sans', label: 'Work Sans', category: 'Sans-serif' },
  { value: 'Noto Sans', label: 'Noto Sans', category: 'Sans-serif' },
  { value: 'Fira Sans', label: 'Fira Sans', category: 'Sans-serif' },
  { value: 'DM Sans', label: 'DM Sans', category: 'Sans-serif' },
  { value: 'Manrope', label: 'Manrope', category: 'Sans-serif' },
  {
    value: 'Plus Jakarta Sans',
    label: 'Plus Jakarta Sans',
    category: 'Sans-serif',
  },
  { value: 'Space Grotesk', label: 'Space Grotesk', category: 'Sans-serif' },
  { value: 'Outfit', label: 'Outfit', category: 'Sans-serif' },
  { value: 'Sora', label: 'Sora', category: 'Sans-serif' },
  { value: 'Albert Sans', label: 'Albert Sans', category: 'Sans-serif' },
  { value: 'Figtree', label: 'Figtree', category: 'Sans-serif' },
  { value: 'Geist', label: 'Geist', category: 'Sans-serif' },
  // Serif - Classic & Elegant
  { value: 'Playfair Display', label: 'Playfair Display', category: 'Serif' },
  { value: 'Merriweather', label: 'Merriweather', category: 'Serif' },
  { value: 'Lora', label: 'Lora', category: 'Serif' },
  { value: 'PT Serif', label: 'PT Serif', category: 'Serif' },
  { value: 'Source Serif 4', label: 'Source Serif 4', category: 'Serif' },
  { value: 'Crimson Text', label: 'Crimson Text', category: 'Serif' },
  { value: 'Libre Baskerville', label: 'Libre Baskerville', category: 'Serif' },
  {
    value: 'Cormorant Garamond',
    label: 'Cormorant Garamond',
    category: 'Serif',
  },
  // Monospace - Code & Technical
  { value: 'JetBrains Mono', label: 'JetBrains Mono', category: 'Monospace' },
  { value: 'Fira Code', label: 'Fira Code', category: 'Monospace' },
  { value: 'Source Code Pro', label: 'Source Code Pro', category: 'Monospace' },
  { value: 'IBM Plex Mono', label: 'IBM Plex Mono', category: 'Monospace' },
  // Display - Headlines & Impact
  { value: 'Bebas Neue', label: 'Bebas Neue', category: 'Display' },
  { value: 'Oswald', label: 'Oswald', category: 'Display' },
  { value: 'Archivo Black', label: 'Archivo Black', category: 'Display' },
];

// Font weight options
const fontWeights = [
  { value: '100', label: 'Thin', numLabel: '100' },
  { value: '200', label: 'ExtraLight', numLabel: '200' },
  { value: '300', label: 'Light', numLabel: '300' },
  { value: '400', label: 'Regular', numLabel: '400' },
  { value: '500', label: 'Medium', numLabel: '500' },
  { value: '600', label: 'SemiBold', numLabel: '600' },
  { value: '700', label: 'Bold', numLabel: '700' },
  { value: '800', label: 'ExtraBold', numLabel: '800' },
  { value: '900', label: 'Black', numLabel: '900' },
];

// Font source options
const fontSourceOptions = {
  system: { value: 'system', label: __('System Default', 'flexify-dashboard') },
  google: { value: 'google', label: __('Google Fonts', 'flexify-dashboard') },
  url: { value: 'url', label: __('Custom URL', 'flexify-dashboard') },
  upload: { value: 'upload', label: __('Upload Font', 'flexify-dashboard') },
};

// Local state
const googleFontSearch = ref('');
const selectedGoogleWeights = ref(['400', '500', '600', '700']);
const isDropdownOpen = ref(false);
const highlightedIndex = ref(-1);
const dropdownRef = ref(null);
const inputRef = ref(null);
const fontInputRef = ref(null);
const previewWeight = ref('400');
const isFontLoading = ref(false);
const loadedFonts = ref(new Set());
const medialibrary = ref(null);
const isUploading = ref(false);

// Check if font uploads is enabled in settings (defaults to true if not set)
const isFontUploadsEnabled = computed(() => {
  // Default to true if the setting hasn't been explicitly set
  if (props.modelValue?.enable_font_uploads === undefined) {
    return true;
  }
  return props.modelValue?.enable_font_uploads === true;
});

// Enable font uploads by updating the setting
const enableFontUploads = () => {
  emit('update:modelValue', {
    ...props.modelValue,
    enable_font_uploads: true,
  });
};

// Computed getters/setters for settings
const fontSource = computed({
  get: () => props.modelValue.custom_font_source || 'system',
  set: (value) => {
    emit('update:modelValue', {
      ...props.modelValue,
      custom_font_source: value,
    });
  },
});

const fontFamily = computed({
  get: () => props.modelValue.custom_font_family || '',
  set: (value) => {
    emit('update:modelValue', {
      ...props.modelValue,
      custom_font_family: value,
    });
  },
});

const fontUrl = computed({
  get: () => props.modelValue.custom_font_url || '',
  set: (value) => {
    emit('update:modelValue', {
      ...props.modelValue,
      custom_font_url: value,
    });
  },
});

const fontFiles = computed({
  get: () => props.modelValue.custom_font_files || [],
  set: (value) => {
    emit('update:modelValue', {
      ...props.modelValue,
      custom_font_files: value,
    });
  },
});

// Filtered and grouped Google Fonts based on search
const filteredGoogleFonts = computed(() => {
  let fonts = popularGoogleFonts;
  if (googleFontSearch.value) {
    const search = googleFontSearch.value.toLowerCase();
    fonts = popularGoogleFonts.filter((font) =>
      font.label.toLowerCase().includes(search)
    );
  }
  return fonts;
});

// Group fonts by category
const groupedFonts = computed(() => {
  const groups = {};
  filteredGoogleFonts.value.forEach((font) => {
    if (!groups[font.category]) {
      groups[font.category] = [];
    }
    groups[font.category].push(font);
  });
  return groups;
});

// Flat list for keyboard navigation
const flatFontList = computed(() => filteredGoogleFonts.value);

// Generate Google Fonts URL based on selected font and weights
const googleFontsUrl = computed(() => {
  if (!fontFamily.value || fontSource.value !== 'google') return '';
  const weights = selectedGoogleWeights.value.join(';');
  const familyParam = fontFamily.value.replace(/\s+/g, '+');
  return `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weights}&display=swap`;
});

// Generate preview URL for dropdown fonts
const getPreviewUrl = (fontName) => {
  const familyParam = fontName.replace(/\s+/g, '+');
  return `https://fonts.googleapis.com/css2?family=${familyParam}:wght@400;700&display=swap`;
};

// Watch Google font selection to update URL
watch([fontFamily, selectedGoogleWeights], () => {
  if (fontSource.value === 'google' && fontFamily.value) {
    fontUrl.value = googleFontsUrl.value;
    loadFontForPreview(fontFamily.value);
  }
});

// Watch for font source changes
watch(fontSource, (newSource) => {
  if (newSource === 'google' && fontFamily.value) {
    loadFontForPreview(fontFamily.value);
  }
});

// Load font for preview
const loadFontForPreview = async (fontName) => {
  if (loadedFonts.value.has(fontName)) return;

  isFontLoading.value = true;
  const link = document.createElement('link');
  link.href = getPreviewUrl(fontName);
  link.rel = 'stylesheet';

  link.onload = () => {
    loadedFonts.value.add(fontName);
    isFontLoading.value = false;
  };
  link.onerror = () => {
    isFontLoading.value = false;
  };

  document.head.appendChild(link);
};

// Preload fonts for dropdown preview
const preloadDropdownFonts = () => {
  // Load first few fonts for smooth preview
  const fontsToPreload = popularGoogleFonts.slice(0, 8);
  fontsToPreload.forEach((font) => {
    if (!loadedFonts.value.has(font.value)) {
      loadFontForPreview(font.value);
    }
  });
};

// Select a Google Font
const selectGoogleFont = (fontName) => {
  fontFamily.value = fontName;
  googleFontSearch.value = '';
  isDropdownOpen.value = false;
  highlightedIndex.value = -1;
};

// Clear font selection
const clearFontSelection = () => {
  fontFamily.value = '';
  googleFontSearch.value = '';
  nextTick(() => {
    isDropdownOpen.value = true;
  });
};

// Toggle weight selection
const toggleWeight = (weight) => {
  const index = selectedGoogleWeights.value.indexOf(weight);
  if (index > -1) {
    // Don't allow removing last weight
    if (selectedGoogleWeights.value.length > 1) {
      selectedGoogleWeights.value = selectedGoogleWeights.value.filter(
        (w) => w !== weight
      );
    }
  } else {
    selectedGoogleWeights.value = [
      ...selectedGoogleWeights.value,
      weight,
    ].sort();
  }
};

// Handle input focus
const handleInputFocus = () => {
  isDropdownOpen.value = true;
  highlightedIndex.value = -1;
  preloadDropdownFonts();
};

// Handle input blur - delayed to allow click events
const handleInputBlur = () => {
  // Don't close immediately - let click handler work
};

// Handle click outside
const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isDropdownOpen.value = false;
    highlightedIndex.value = -1;
  }
};

// Keyboard navigation
const handleKeydown = (event) => {
  if (!isDropdownOpen.value) {
    if (event.key === 'ArrowDown' || event.key === 'Enter') {
      isDropdownOpen.value = true;
      event.preventDefault();
    }
    return;
  }

  const listLength = flatFontList.value.length;

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      highlightedIndex.value = Math.min(
        highlightedIndex.value + 1,
        listLength - 1
      );
      scrollToHighlighted();
      break;
    case 'ArrowUp':
      event.preventDefault();
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0);
      scrollToHighlighted();
      break;
    case 'Enter':
      event.preventDefault();
      if (
        highlightedIndex.value >= 0 &&
        flatFontList.value[highlightedIndex.value]
      ) {
        selectGoogleFont(flatFontList.value[highlightedIndex.value].value);
      }
      break;
    case 'Escape':
      isDropdownOpen.value = false;
      highlightedIndex.value = -1;
      break;
  }
};

// Scroll to highlighted item
const scrollToHighlighted = () => {
  nextTick(() => {
    const highlighted = dropdownRef.value?.querySelector(
      '[data-highlighted="true"]'
    );
    if (highlighted) {
      highlighted.scrollIntoView({ block: 'nearest' });
    }
  });
};

// Highlight search match
const highlightMatch = (text, search) => {
  if (!search) return text;
  const regex = new RegExp(`(${search})`, 'gi');
  return text.replace(
    regex,
    '<mark class="bg-amber-200 dark:bg-amber-700/50 text-inherit rounded px-0.5">$1</mark>'
  );
};

// Font file upload handling using media library v2
const uploadFontFile = async () => {
  if (!medialibrary.value) return;

  isUploading.value = true;

  try {
    const selected = await medialibrary.value.select({
      imageTypes: 'font', // Filter to show only font files
      multiple: false,
      chosen: [],
    });

    // User cancelled selection
    if (!Array.isArray(selected) || selected.length === 0) {
      isUploading.value = false;
      return;
    }

    const file = selected[0];
    const { source_url, mime_type } = file;

    // Validate it's a font file
    const validFontTypes = [
      'font/woff2',
      'font/woff',
      'font/ttf',
      'font/otf',
      'application/font-woff2',
      'application/font-woff',
      'application/x-font-ttf',
      'application/x-font-otf',
      'application/vnd.ms-fontobject',
    ];

    // Also check file extension as fallback
    const validExtensions = ['.woff2', '.woff', '.ttf', '.otf', '.eot'];
    const fileExtension = source_url.toLowerCase().match(/\.[^.]+$/)?.[0] || '';

    const isValidFont =
      validFontTypes.includes(mime_type) ||
      validExtensions.includes(fileExtension);

    if (!isValidFont) {
      // Still allow - user might know what they're doing
      console.warn(
        'Selected file may not be a font file:',
        mime_type,
        source_url
      );
    }

    addFontFile(source_url, '400', 'normal');
  } catch (error) {
    console.error('Error selecting font file:', error);
  } finally {
    isUploading.value = false;
  }
};

// Add font file to list
const addFontFile = (url, weight = '400', style = 'normal') => {
  fontFiles.value = [...fontFiles.value, { url, weight, style }];
};

// Remove font file
const removeFontFile = (index) => {
  fontFiles.value = fontFiles.value.filter((_, i) => i !== index);
};

// Update font file weight
const updateFontFileWeight = (index, weight) => {
  const updated = [...fontFiles.value];
  updated[index] = { ...updated[index], weight };
  fontFiles.value = updated;
};

// Reset font to system default
const resetToSystem = () => {
  fontSource.value = 'system';
  fontFamily.value = '';
  fontUrl.value = '';
  fontFiles.value = [];
};

// Preview font family CSS
const previewFontStyle = computed(() => {
  if (fontSource.value === 'system' || !fontFamily.value) {
    return {};
  }
  return {
    fontFamily: `"${fontFamily.value}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
    fontWeight: previewWeight.value,
  };
});

// Load Google Font for preview
const previewStylesheet = computed(() => {
  if (fontSource.value === 'google' && fontFamily.value) {
    return googleFontsUrl.value;
  }
  if (fontSource.value === 'url' && fontUrl.value) {
    return fontUrl.value;
  }
  return '';
});

// Setup event listeners
onMounted(() => {
  document.addEventListener('click', handleClickOutside);

  // Load current font if google and already selected
  if (fontSource.value === 'google' && fontFamily.value) {
    loadFontForPreview(fontFamily.value);
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div class="col-span-2 flex flex-col gap-6">
    <!-- Preview Stylesheet Link (for live preview) -->
    <link v-if="previewStylesheet" rel="stylesheet" :href="previewStylesheet" />

    <!-- Font Source Selector -->
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {{ __('Font Source', 'flexify-dashboard') }}
      </label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="(option, key) in fontSourceOptions"
          :key="key"
          @click="fontSource = option.value"
          class="px-4 py-2 text-sm rounded-lg border-2 transition-all duration-200"
          :class="
            fontSource === option.value
              ? 'bg-brand-50 dark:bg-brand-950/50 border-brand-400 dark:border-brand-600 text-brand-700 dark:text-brand-300 shadow-sm'
              : 'bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800'
          "
        >
          <span class="flex items-center gap-2">
            <AppIcon
              :icon="
                key === 'system'
                  ? 'desktop'
                  : key === 'google'
                  ? 'google'
                  : key === 'url'
                  ? 'link'
                  : 'upload'
              "
              class="text-base"
            />
            {{ option.label }}
          </span>
        </button>
      </div>
    </div>

    <!-- Google Fonts Section -->
    <div v-if="fontSource === 'google'" class="flex flex-col gap-5">
      <!-- Font Search/Select -->
      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {{ __('Select Font', 'flexify-dashboard') }}
        </label>

        <!-- Selected Font Display or Search Input -->
        <div ref="dropdownRef" class="relative max-w-[400px]">
          <!-- Selected Font Chip -->
          <div
            v-if="fontFamily && !isDropdownOpen"
            class="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
            @click="handleInputFocus"
          >
            <div class="flex-1">
              <p
                class="text-base font-medium text-zinc-900 dark:text-zinc-100"
                :style="{ fontFamily: `'${fontFamily}', sans-serif` }"
              >
                {{ fontFamily }}
              </p>
              <p class="text-xs text-zinc-400 dark:text-zinc-500">
                {{ __('Click to change', 'flexify-dashboard') }}
              </p>
            </div>
            <button
              @click.stop="clearFontSelection"
              class="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              :title="__('Clear selection', 'flexify-dashboard')"
            >
              <AppIcon icon="close" class="text-lg" />
            </button>
          </div>

          <!-- Search Input -->
          <div v-else class="relative">
            <input
              ref="fontInputRef"
              v-model="googleFontSearch"
              type="text"
              :placeholder="__('Search fonts...', 'flexify-dashboard')"
              class="w-full px-4 py-2.5 pl-10 bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl text-sm transition-all outline-none focus:border-brand-400 dark:focus:border-brand-600 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900/30"
              @focus="handleInputFocus"
              @blur="handleInputBlur"
              @keydown="handleKeydown"
            />
            <AppIcon
              icon="search"
              class="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-zinc-400"
            />
          </div>

          <!-- Dropdown -->
          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 translate-y-1"
          >
            <div
              v-if="isDropdownOpen"
              class="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl shadow-zinc-900/10 dark:shadow-zinc-950/50 max-h-[360px] overflow-y-auto overflow-x-hidden"
            >
              <!-- Empty State -->
              <div
                v-if="filteredGoogleFonts.length === 0"
                class="px-4 py-8 text-center"
              >
                <AppIcon
                  icon="search"
                  class="text-3xl text-zinc-300 dark:text-zinc-600 mb-2"
                />
                <p class="text-sm text-zinc-500 dark:text-zinc-400">
                  {{ __('No fonts found', 'flexify-dashboard') }}
                </p>
                <p class="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                  {{ __('Try a different search term', 'flexify-dashboard') }}
                </p>
              </div>

              <!-- Grouped Font List -->
              <div v-else class="py-2">
                <template
                  v-for="(fonts, category) in groupedFonts"
                  :key="category"
                >
                  <div
                    class="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider bg-zinc-50 dark:bg-zinc-900/50 sticky top-0"
                  >
                    {{ category }}
                  </div>
                  <button
                    v-for="(font, idx) in fonts"
                    :key="font.value"
                    @click="selectGoogleFont(font.value)"
                    @mouseenter="
                      highlightedIndex = flatFontList.findIndex(
                        (f) => f.value === font.value
                      )
                    "
                    :data-highlighted="
                      flatFontList.findIndex((f) => f.value === font.value) ===
                      highlightedIndex
                    "
                    class="w-full px-3 py-2.5 text-left transition-colors flex items-center gap-3 group"
                    :class="[
                      fontFamily === font.value
                        ? 'bg-brand-50 dark:bg-brand-900/30'
                        : flatFontList.findIndex(
                            (f) => f.value === font.value
                          ) === highlightedIndex
                        ? 'bg-zinc-100 dark:bg-zinc-700/50'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-700/30',
                    ]"
                  >
                    <!-- Font Preview -->
                    <link rel="stylesheet" :href="getPreviewUrl(font.value)" />
                    <span
                      class="text-lg text-zinc-700 dark:text-zinc-200 flex-1 truncate"
                      :style="{ fontFamily: `'${font.value}', sans-serif` }"
                      v-html="highlightMatch(font.label, googleFontSearch)"
                    />

                    <!-- Selected Check -->
                    <span
                      v-if="fontFamily === font.value"
                      class="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center"
                    >
                      <AppIcon icon="check" class="text-xs text-white" />
                    </span>
                  </button>
                </template>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Custom Font Name Input -->
        <div
          class="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500 mt-1"
        >
          <span>{{ __('Or enter custom:', 'flexify-dashboard') }}</span>
          <input
            v-model="fontFamily"
            type="text"
            :placeholder="__('Font name...', 'flexify-dashboard')"
            class="px-2 py-1 bg-transparent border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-xs focus:border-brand-400 dark:focus:border-brand-600 outline-none transition-colors w-40"
          />
        </div>
      </div>

      <!-- Font Weights -->
      <div v-if="fontFamily" class="flex flex-col gap-3">
        <label class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {{ __('Font Weights', 'flexify-dashboard') }}
        </label>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="weight in fontWeights"
            :key="weight.value"
            @click="toggleWeight(weight.value)"
            class="group relative px-3 py-2 text-xs rounded-lg border-2 transition-all duration-200"
            :class="
              selectedGoogleWeights.includes(weight.value)
                ? 'bg-brand-50 dark:bg-brand-950/50 border-brand-400 dark:border-brand-600 text-brand-700 dark:text-brand-300'
                : 'bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-600'
            "
          >
            <span
              :style="{
                fontFamily: `'${fontFamily}', sans-serif`,
                fontWeight: weight.value,
              }"
              class="block"
            >
              {{ weight.numLabel }}
            </span>
            <!-- Tooltip -->
            <span
              class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 dark:bg-zinc-700 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            >
              {{ weight.label }}
            </span>
          </button>
        </div>
        <p class="text-xs text-zinc-400 dark:text-zinc-500">
          {{
            __(
              'Select weights to include. At least one is required.',
              'flexify-dashboard'
            )
          }}
        </p>
      </div>
    </div>

    <!-- Custom URL Section -->
    <div v-if="fontSource === 'url'" class="flex flex-col gap-5">
      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {{ __('Font Stylesheet URL', 'flexify-dashboard') }}
        </label>
        <div class="relative max-w-[500px]">
          <input
            v-model="fontUrl"
            type="text"
            :placeholder="
              __('https://fonts.googleapis.com/css2?family=...', 'flexify-dashboard')
            "
            class="w-full px-4 py-2.5 pl-10 bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl text-sm transition-all outline-none focus:border-brand-400 dark:focus:border-brand-600"
          />
          <AppIcon
            icon="link"
            class="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-zinc-400"
          />
        </div>
        <p class="text-xs text-zinc-400 dark:text-zinc-500">
          {{
            __(
              'Enter the URL to an external font stylesheet (CSS file)',
              'flexify-dashboard'
            )
          }}
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {{ __('Font Family Name', 'flexify-dashboard') }}
        </label>
        <input
          v-model="fontFamily"
          type="text"
          :placeholder="__('e.g., Inter, Roboto, Custom Font', 'flexify-dashboard')"
          class="max-w-[300px] px-4 py-2.5 bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl text-sm transition-all outline-none focus:border-brand-400 dark:focus:border-brand-600"
        />
        <p class="text-xs text-zinc-400 dark:text-zinc-500">
          {{
            __(
              'The exact font-family name as defined in the stylesheet',
              'flexify-dashboard'
            )
          }}
        </p>
      </div>
    </div>

    <!-- Upload Font Section -->
    <div v-if="fontSource === 'upload'" class="flex flex-col gap-5">
      <!-- Notice when font uploads is disabled -->
      <div
        v-if="!isFontUploadsEnabled"
        class="flex items-start gap-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl"
      >
        <div
          class="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center"
        >
          <AppIcon
            icon="warning"
            class="text-xl text-amber-600 dark:text-amber-400"
          />
        </div>
        <div class="flex-1">
          <h4 class="text-sm font-semibold text-amber-800 dark:text-amber-200">
            {{ __('Font Uploads Disabled', 'flexify-dashboard') }}
          </h4>
          <p class="text-sm text-amber-700 dark:text-amber-300 mt-1">
            {{
              __(
                'Font file uploads are currently disabled. Enable font uploads in the Media settings to upload custom font files (.woff2, .woff, .ttf, .otf).',
                'flexify-dashboard'
              )
            }}
          </p>
          <button
            @click="enableFontUploads"
            class="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <AppIcon icon="check" class="text-base" />
            {{ __('Enable Font Uploads', 'flexify-dashboard') }}
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {{ __('Font Family Name', 'flexify-dashboard') }}
        </label>
        <input
          v-model="fontFamily"
          type="text"
          :placeholder="__('e.g., My Custom Font', 'flexify-dashboard')"
          class="max-w-[300px] px-4 py-2.5 bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl text-sm transition-all outline-none focus:border-brand-400 dark:focus:border-brand-600"
        />
        <p class="text-xs text-zinc-400 dark:text-zinc-500">
          {{ __('Choose a name for your custom font family', 'flexify-dashboard') }}
        </p>
      </div>

      <!-- Uploaded Font Files -->
      <div class="flex flex-col gap-3">
        <label class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {{ __('Font Files', 'flexify-dashboard') }}
        </label>

        <!-- Empty State - Clickable (only when font uploads enabled) -->
        <button
          v-if="fontFiles.length === 0 && isFontUploadsEnabled"
          @click="uploadFontFile"
          :disabled="isUploading"
          class="group flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl text-center cursor-pointer hover:border-brand-400 dark:hover:border-brand-600 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div
            class="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-brand-100 dark:group-hover:bg-brand-900/30 transition-colors"
          >
            <template v-if="isUploading">
              <div
                class="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"
              ></div>
            </template>
            <template v-else>
              <AppIcon
                icon="upload"
                class="text-2xl text-zinc-400 group-hover:text-brand-500 transition-colors"
              />
            </template>
          </div>
          <div>
            <p
              class="text-sm font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors"
            >
              {{
                isUploading
                  ? __('Opening Media Library...', 'flexify-dashboard')
                  : __('Click to select font files', 'flexify-dashboard')
              }}
            </p>
            <p class="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              {{
                __('Supported formats: .woff2, .woff, .ttf, .otf', 'flexify-dashboard')
              }}
            </p>
          </div>
        </button>

        <!-- Empty state when font uploads disabled -->
        <div
          v-if="fontFiles.length === 0 && !isFontUploadsEnabled"
          class="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl text-center opacity-50"
        >
          <div
            class="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"
          >
            <AppIcon icon="upload" class="text-2xl text-zinc-400" />
          </div>
          <div>
            <p class="text-sm font-medium text-zinc-500 dark:text-zinc-500">
              {{ __('Enable font uploads to add font files', 'flexify-dashboard') }}
            </p>
          </div>
        </div>

        <!-- Font Files List -->
        <div
          v-for="(file, index) in fontFiles"
          :key="index"
          class="flex items-center gap-3 p-3 bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700"
        >
          <div
            class="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0"
          >
            <AppIcon
              icon="font_download"
              class="text-base text-brand-600 dark:text-brand-400"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p
              class="text-sm text-zinc-700 dark:text-zinc-300 truncate font-medium"
            >
              {{ file.url.split('/').pop() }}
            </p>
          </div>
          <select
            :value="file.weight"
            @change="updateFontFileWeight(index, $event.target.value)"
            class="px-3 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg focus:outline-none focus:border-brand-400"
          >
            <option
              v-for="weight in fontWeights"
              :key="weight.value"
              :value="weight.value"
            >
              {{ weight.numLabel }} - {{ weight.label }}
            </option>
          </select>
          <button
            @click="removeFontFile(index)"
            class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-400 hover:text-red-500 transition-colors"
          >
            <AppIcon icon="delete" class="text-lg" />
          </button>
        </div>

        <button
          v-if="isFontUploadsEnabled"
          @click="uploadFontFile"
          :disabled="isUploading"
          class="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 hover:border-brand-400 dark:hover:border-brand-600 hover:text-brand-600 dark:hover:text-brand-400 transition-colors w-fit disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <template v-if="isUploading">
            <div
              class="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"
            ></div>
            {{ __('Opening Media Library...', 'flexify-dashboard') }}
          </template>
          <template v-else>
            <AppIcon icon="add" class="text-lg" />
            {{ __('Select Font File', 'flexify-dashboard') }}
          </template>
        </button>

        <p
          class="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5"
        >
          <AppIcon icon="info" class="text-sm" />
          {{
            __(
              'Select font files from your media library. Supported: .woff2, .woff, .ttf, .otf',
              'flexify-dashboard'
            )
          }}
        </p>
      </div>
    </div>

    <!-- Font Preview -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-[0.98]"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-[0.98]"
    >
      <div
        v-if="fontSource !== 'system' && fontFamily"
        class="relative flex flex-col gap-4 p-5 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-800/50 dark:to-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden"
      >
        <!-- Loading overlay -->
        <div
          v-if="isFontLoading"
          class="absolute inset-0 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center z-10"
        >
          <div class="flex items-center gap-2 text-sm text-zinc-500">
            <div
              class="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"
            ></div>
            {{ __('Loading font...', 'flexify-dashboard') }}
          </div>
        </div>

        <div class="flex items-center justify-between gap-4">
          <label
            class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider"
          >
            {{ __('Preview', 'flexify-dashboard') }}
          </label>

          <!-- Weight selector for preview -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-zinc-400">{{
              __('Weight:', 'flexify-dashboard')
            }}</span>
            <select
              v-model="previewWeight"
              class="px-2 py-1 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md"
            >
              <option
                v-for="weight in selectedGoogleWeights"
                :key="weight"
                :value="weight"
              >
                {{ weight }}
              </option>
            </select>
          </div>
        </div>

        <div class="space-y-3">
          <p
            class="text-3xl text-zinc-900 dark:text-zinc-100 leading-tight"
            :style="previewFontStyle"
          >
            The quick brown fox jumps over the lazy dog
          </p>
          <p
            class="text-lg text-zinc-600 dark:text-zinc-400"
            :style="previewFontStyle"
          >
            ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz
          </p>
          <p
            class="text-base text-zinc-500 dark:text-zinc-500 font-mono"
            :style="previewFontStyle"
          >
            0123456789 !@#$%^&*() {}[]|;:'",.<>?/
          </p>
        </div>

        <div
          class="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-700"
        >
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">
              {{ fontFamily }}
            </p>
          </div>
          <p class="text-xs text-zinc-400 dark:text-zinc-500">
            {{ selectedGoogleWeights.length }}
            {{ __('weights loaded', 'flexify-dashboard') }}
          </p>
        </div>
      </div>
    </Transition>

    <!-- Reset Button -->
    <div v-if="fontSource !== 'system'" class="flex">
      <button
        @click="resetToSystem"
        class="flex items-center gap-2 px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
      >
        <AppIcon icon="refresh" class="text-base" />
        {{ __('Reset to system default', 'flexify-dashboard') }}
      </button>
    </div>

    <!-- Media Library Component -->
    <MediaLibrary ref="medialibrary" :should-teleport="true" />
  </div>
</template>
