<script setup>
import {
  ref,
  defineModel,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
  defineProps,
} from 'vue';

// Tip tap
import { Editor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import ImageResize from 'tiptap-extension-resize-image';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { BackgroundColor } from './src/tiptapColorExtensions.js';

import AppButton from '@/components/utility/app-button/index.vue';
import AppIcon from '@/components/utility/icons/index.vue';
import ContextMenu from '@/components/utility/context-menu/index.vue';
import ColorPicker from './src/ColorPicker.vue';
import LinkPicker from './src/link-picker.vue';
import MediaLibrary from '@/components/utility/media-library/index.vue';

import { useColorScheme } from '@/assets/js/functions/useColorScheme.js';
const { prefersDark } = useColorScheme();

const editor = ref(null);
const open = ref(false);
const medialibrary = ref(null);
const richText = defineModel();
const props = defineProps(['placeholder', 'buttontext']);
const headingList = ref(false);
const isSelecting = ref(false);

// This ensures extensions are created only once and reused
const createExtensions = () => [
  StarterKit.configure({ image: false }),
  ImageResize,
  TextStyle,
  Color,
  BackgroundColor,
  Link,
  Image.configure({
    HTMLAttributes: {
      class: 'editor-image',
    },
  }),
  TextAlign.configure({
    types: ['heading', 'paragraph'],
    alignments: ['left', 'center', 'right', 'justify'],
  }),
  Placeholder.configure({
    placeholder: props.placeholder || __('Write something...', 'vendbase'),
  }),
];

const addImage = async () => {
  const selected = await medialibrary.value.select({});

  // Cancelled by user
  if (!Array.isArray(selected)) return;
  if (!selected.length) return;

  const { title, id, source_url, mime_type } = selected[0];
  if (!mime_type.includes('image') && !mime_type.includes('svg')) return;
  editor.value.chain().focus().setImage({ src: source_url }).run();
};

onMounted(() => {
  // Create editor with fresh extensions
  editor.value = new Editor({
    extensions: createExtensions(),
    content: richText.value,
    autofocus: true,
    editable: true,
    onUpdate: ({ editor }) => {
      richText.value = editor.getHTML();
    },
  });
});

onBeforeUnmount(() => {
  // Properly destroy editor
  if (editor.value) {
    editor.value.destroy();
    editor.value = null;
  }
});

// Watch for content changes from outside
watch(richText, (newContent) => {
  if (editor.value && editor.value.getHTML() !== newContent) {
    editor.value.commands.setContent(newContent, false);
  }
});

// Add mousedown and mouseup handlers to track selection state
const handleEditorMouseDown = () => {
  isSelecting.value = true;
};

const handleEditorMouseUp = () => {
  // Use setTimeout to ensure this runs after click events
  setTimeout(() => {
    isSelecting.value = false;
  }, 0);
};

// Modify the modal close handler to check selection state
const handleModalClick = (event) => {
  if (!isSelecting.value) {
    open.value = false;
  }
};

const setLink = () => {
  const url = prompt('URL');
  if (url) {
    editor.value.chain().focus().setLink({ href: url }).run();
  }
};

const removeLink = () => {
  editor.value.chain().focus().unsetLink().run();
};
</script>

<template>
  <!-- Editor -->
  <div
    class="editor-wrapper grow flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-700 rounded-lg"
    key="editorWrapper"
  >
    <div
      v-if="editor"
      class="editor-menu flex flex-row items-center py-3 px-4 border-b border-zinc-200 dark:border-zinc-700 shadow-sm"
    >
      <AppButton
        type="transparent"
        @mouseenter="headingList = true"
        @mouseleave="headingList = false"
        class="relative"
      >
        <AppIcon icon="text_fields" class="text-xl" />
        <div
          v-if="headingList"
          class="absolute top-full left-0 bg-white dark:bg-zinc-900 rounded-xl shadow p-3 flex flex-col"
        >
          <AppButton
            type="transparent"
            :class="
              editor.isActive('heading', { level: 1 })
                ? 'text-zinc-900 dark:text-zinc-100'
                : 'text-zinc-400 dark:text-zinc-500'
            "
            @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
            >Heading 1</AppButton
          >
          <AppButton
            type="transparent"
            :class="
              editor.isActive('heading', { level: 2 })
                ? 'text-zinc-900 dark:text-zinc-100'
                : 'text-zinc-400 dark:text-zinc-500'
            "
            @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
            >Heading 2</AppButton
          >
          <AppButton
            type="transparent"
            :class="
              editor.isActive('heading', { level: 3 })
                ? 'text-zinc-900 dark:text-zinc-100'
                : 'text-zinc-400 dark:text-zinc-500'
            "
            @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
            >Heading 3</AppButton
          >
          <AppButton
            type="transparent"
            :class="
              editor.isActive('heading', { level: 4 })
                ? 'text-zinc-900 dark:text-zinc-100'
                : 'text-zinc-400 dark:text-zinc-500'
            "
            @click="editor.chain().focus().toggleHeading({ level: 4 }).run()"
            >Heading 4</AppButton
          >
          <AppButton
            type="transparent"
            :class="
              editor.isActive('heading', { level: 5 })
                ? 'text-zinc-900 dark:text-zinc-100'
                : 'text-zinc-400 dark:text-zinc-500'
            "
            @click="editor.chain().focus().toggleHeading({ level: 5 }).run()"
            >Heading 5</AppButton
          >
          <AppButton
            type="transparent"
            :class="
              editor.isActive('heading', { level: 6 })
                ? 'text-zinc-900 dark:text-zinc-100'
                : 'text-zinc-400 dark:text-zinc-500'
            "
            @click="editor.chain().focus().toggleHeading({ level: 6 }).run()"
            >Heading 6</AppButton
          >

          <AppButton
            type="transparent"
            :class="
              editor.isActive('paragraph')
                ? 'text-zinc-900 dark:text-zinc-100'
                : 'text-zinc-400 dark:text-zinc-500'
            "
            @click="editor.chain().focus().setParagraph().run()"
            >Paragraph</AppButton
          >
        </div>
      </AppButton>

      <AppButton
        type="transparent"
        @click="editor.chain().focus().toggleBold().run()"
      >
        <AppIcon
          icon="format_bold"
          class="text-xl"
          :class="
            editor.isActive('bold')
              ? 'text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-400 dark:text-zinc-500'
          "
        />
      </AppButton>

      <AppButton
        type="transparent"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <AppIcon
          icon="format_italic"
          class="text-xl"
          :class="
            editor.isActive('italic')
              ? 'text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-400 dark:text-zinc-500'
          "
        />
      </AppButton>

      <AppButton
        type="transparent"
        @click="editor.chain().focus().toggleStrike().run()"
      >
        <AppIcon
          icon="format_strikethrough"
          class="text-xl"
          :class="
            editor.isActive('strike')
              ? 'text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-400 dark:text-zinc-500'
          "
        />
      </AppButton>

      <div class="h-6 border-l border-zinc-200 dark:border-zinc-700 mx-2"></div>

      <AppButton
        type="transparent"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        <AppIcon
          icon="format_list_bulleted"
          class="text-xl"
          :class="
            editor.isActive('bulletList')
              ? 'text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-400 dark:text-zinc-500'
          "
        />
      </AppButton>

      <AppButton
        type="transparent"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        <AppIcon
          icon="format_list_numbered"
          class="text-xl"
          :class="
            editor.isActive('orderedList')
              ? 'text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-400 dark:text-zinc-500'
          "
        />
      </AppButton>

      <LinkPicker v-model="editor" />

      <AppButton
        type="transparent"
        @click="editor.chain().focus().toggleCode().run()"
        :class="
          editor.isActive('code')
            ? 'text-zinc-900 dark:text-zinc-100'
            : 'text-zinc-400 dark:text-zinc-500'
        "
      >
        <AppIcon icon="code" class="text-xl" />
      </AppButton>

      <div class="h-6 border-l border-zinc-200 dark:border-zinc-700 mx-2"></div>

      <!-- Alignments -->
      <AppButton
        type="transparent"
        @click="editor.chain().focus().setTextAlign('left').run()"
      >
        <AppIcon
          icon="format_align_left"
          class="text-xl"
          :class="
            editor.isActive({ textAlign: 'left' })
              ? 'text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-400 dark:text-zinc-500'
          "
        />
      </AppButton>
      <AppButton
        type="transparent"
        @click="editor.chain().focus().setTextAlign('center').run()"
      >
        <AppIcon
          icon="format_align_center"
          class="text-xl"
          :class="
            editor.isActive({ textAlign: 'center' })
              ? 'text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-400 dark:text-zinc-500'
          "
        />
      </AppButton>
      <AppButton
        type="transparent"
        @click="editor.chain().focus().setTextAlign('right').run()"
      >
        <AppIcon
          icon="format_align_right"
          class="text-xl"
          :class="
            editor.isActive({ textAlign: 'right' })
              ? 'text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-400 dark:text-zinc-500'
          "
        />
      </AppButton>
      <AppButton
        type="transparent"
        @click="editor.chain().focus().setTextAlign('justify').run()"
      >
        <AppIcon
          icon="format_align_justify"
          class="text-xl"
          :class="
            editor.isActive({ textAlign: 'justify' })
              ? 'text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-400 dark:text-zinc-500'
          "
        />
      </AppButton>

      <div class="h-6 border-l border-zinc-200 dark:border-zinc-700 mx-2"></div>

      <AppButton type="transparent" @click="addImage">
        <AppIcon icon="image" class="text-xl" />
      </AppButton>

      <div class="h-6 border-l border-zinc-200 dark:border-zinc-700 mx-2"></div>

      <AppButton
        type="transparent"
        @click="editor.chain().focus().undo().run()"
        :disabled="!editor.can().undo()"
      >
        <AppIcon icon="undo" class="text-xl text-zinc-400 dark:text-zinc-500" />
      </AppButton>

      <AppButton
        type="transparent"
        @click="editor.chain().focus().redo().run()"
        :disabled="!editor.can().redo()"
      >
        <AppIcon icon="redo" class="text-xl text-zinc-400 dark:text-zinc-500" />
      </AppButton>
    </div>

    <editor-content
      :editor="editor"
      class="editor-content grow overflow-auto py-3 px-4"
      @mousedown="handleEditorMouseDown"
      @mouseup="handleEditorMouseUp"
    />
  </div>

  <!-- Actions-->
  <MediaLibrary ref="medialibrary" />
</template>

<style>
.editor-content .ProseMirror {
  outline: none !important;
}
.tiptap.ProseMirror:focus-visible {
  outline: none !important;
}
.editor-content * {
  margin: 0;
  padding: 0;
}

.editor-content p {
  margin: 1em 0;
  line-height: 1.5;
}

.editor-content .ProseMirror > *:first-child {
  margin-top: 0;
}

.editor-content h1 {
  font-size: 2em;
  font-weight: bold;
  margin: 0.67em 0;
  line-height: 1.2;
}

.editor-content h2 {
  font-size: 1.5em;
  font-weight: bold;
  margin: 0.83em 0;
  line-height: 1.2;
}

.editor-content ul {
  list-style-type: disc;
  margin: 1em 0;
  padding-left: 2em;
}

.editor-content ol {
  list-style-type: decimal;
  margin: 1em 0;
  padding-left: 2em;
}

.editor-content li {
  display: list-item;
  margin: 0.5em 0;
}

.editor-content strong {
  font-weight: bold;
}

.editor-content em {
  font-style: italic;
}

.editor-content img {
  max-width: 100%;
  height: auto;
  margin: 1em 0;
}

.editor-content blockquote {
  border-left: 3px solid #ddd;
  margin: 1em 0;
  padding-left: 1em;
  color: #666;
}

.editor-content pre {
  background-color: #f4f4f4;
  padding: 1em;
  border-radius: 4px;
  overflow-x: auto;
}

.editor-content code {
  background-color: #f4f4f4;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: monospace;
}

.editor-content a {
  text-decoration: underline;
  pointer-events: none;
}

.editor-content [style*='text-align: left'] {
  text-align: left;
}

.editor-content [style*='text-align: center'] {
  text-align: center;
}

.editor-content [style*='text-align: right'] {
  text-align: right;
}

.editor-content [style*='text-align: justify'] {
  text-align: justify;
}

.editor-content s,
.editor-content del {
  text-decoration: line-through;
  text-decoration-thickness: 2px;
  text-decoration-color: currentColor;
}

/* Placeholder (at the top) */
.editor-content p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
  opacity: 0.6;
}
</style>
