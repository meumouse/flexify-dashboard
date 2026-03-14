<script setup>
import { ref, defineModel, watchEffect, watch, nextTick, onBeforeUnmount } from "vue";
import { edit as aceEdit } from "ace-builds";
import "ace-builds/src-noconflict/mode-css";
import "ace-builds/src-noconflict/theme-xcode";
import "ace-builds/src-noconflict/theme-twilight";
import "ace-builds/src-noconflict/ext-searchbox"; // Add this import
import { useColorScheme } from "@/assets/js/functions/useColorScheme.js";
const { prefersDark } = useColorScheme();
import AppButton from "@/components/utility/app-button/index.vue";
import AppIcon from "@/components/utility/icons/index.vue";
import OffCanvas from "@/components/utility/offcanvas/index.vue";

const offcanvas = ref(null);
const model = defineModel();
const editornode = ref(null);
let editor, beautify;
let isEditorInitialized = false;
let isUpdatingFromModel = false;

const editorOptions = {
  tabSize: 3,
  wrap: 1, // wrap text to view
  indentedSoftWrap: false,
  indentedSoftWrap: true,
  useWorker: false,
  fontSize: "12px",
  showFoldWidgets: false,
  minLines: 10,
};

/**
 * Initiates the editor instance
 */
const initiateEditor = async () => {
  // Prevent multiple initializations
  if (isEditorInitialized || !editornode.value) return;
  
  // Stops the file running before the block was set
  await nextTick();
  
  if (!editornode.value) return;
  
  editor = aceEdit(editornode.value, editorOptions);
  isEditorInitialized = true;

  if (prefersDark.value) {
    editor.setTheme("ace/theme/twilight");
  } else {
    editor.setTheme("ace/theme/xcode");
  }

  // Add search command
  editor.commands.addCommand({
    name: "find",
    bindKey: { win: "Ctrl-F", mac: "Command-F" },
    exec: function (editor) {
      const searchbox = ace.require("ace/ext/searchbox");
      searchbox.Search(editor);
    },
  });

  editor.setShowPrintMargin(false);
  editor.setHighlightActiveLine(false);
  editor.session.setUseWrapMode(true);
  editor.renderer.updateFontSize();
  editor.container.style.lineHeight = 1.6;
  editor.renderer.setPadding(16);
  editor.renderer.setScrollMargin(14, 14);
  editor.setHighlightActiveLine(false);
  editor.session.setMode("ace/mode/css");

  // Require beautify
  beautify = ace.require("ace/ext/beautify");

  // Set code value - handle undefined/null
  const blockCode = model.value || '';
  editor.setValue(blockCode, -1); // -1 moves cursor to start
  //beautify.beautify(editor.session);

  editor.session.on("change", handleCodeChanges);
  editor.renderer.attachToShadowRoot();

  // Make the editor focus
  editor.focus();
};

/**
 * Handles code changes from the editor and updates the model
 */
const handleCodeChanges = (delta) => {
  if (isUpdatingFromModel) return;
  
  const code = editor.getValue();
  model.value = code;
};

/**
 * Opens the editor and initializes it if needed
 */
const openEditor = async () => {
  offcanvas.value.show();
  
  // Wait for offcanvas to be visible and DOM to be ready
  await nextTick();
  
  // Small delay to ensure DOM is fully rendered
  setTimeout(() => {
    if (!isEditorInitialized && editornode.value) {
      initiateEditor();
    } else if (isEditorInitialized && editor) {
      // If already initialized, ensure editor has latest model value
      const currentEditorValue = editor.getValue();
      const modelCode = model.value || '';
      if (currentEditorValue !== modelCode) {
        isUpdatingFromModel = true;
        editor.setValue(modelCode, -1);
        nextTick(() => {
          isUpdatingFromModel = false;
        });
      }
      editor.focus();
    }
  }, 150);
};

/**
 * Function to programmatically show search box
 */
const showSearch = () => {
  if (editor) {
    const searchbox = ace.require("ace/ext/searchbox");
    searchbox.Search(editor);
  }
};

/**
 * Watch for external model changes and update editor
 * Only updates if editor is already initialized
 */
watch(model, (newValue) => {
  if (!editor || isUpdatingFromModel || !isEditorInitialized) return;
  
  const currentValue = editor.getValue();
  const newCode = newValue || '';
  
  // Only update if different to prevent infinite loops
  if (currentValue !== newCode) {
    isUpdatingFromModel = true;
    editor.setValue(newCode, -1);
    // Use nextTick to reset flag after Vue processes the update
    nextTick(() => {
      isUpdatingFromModel = false;
    });
  }
}, { immediate: false });

/**
 * Watch for editor node availability
 * This is a fallback in case openEditor doesn't trigger initialization
 */
watchEffect(() => {
  // Only initialize if editornode exists and editor hasn't been initialized yet
  // This ensures we don't initialize before the offcanvas is shown
  if (editornode.value && !isEditorInitialized) {
    // Use a longer delay to ensure this is only a fallback
    const timeoutId = setTimeout(() => {
      if (editornode.value && !isEditorInitialized) {
        initiateEditor();
      }
    }, 300);
    
    // Cleanup timeout if component unmounts
    return () => clearTimeout(timeoutId);
  }
});

/**
 * Cleanup editor on unmount
 */
onBeforeUnmount(() => {
  if (editor) {
    editor.destroy();
    editor = null;
    isEditorInitialized = false;
  }
});
</script>

<template>
  <div class="inline-flex">
    <AppButton type="default" @click="openEditor">
      <div class="flex flex-row items-center gap-2">
        <AppIcon icon="code" class="text-zinc-500 dark:text-zinc-400" />
        <span>{{ __("Edit CSS", "flexify-dashboard") }}</span>
      </div>
    </AppButton>
  </div>
  <OffCanvas ref="offcanvas">
    <div class="w-[660px] max-w-full h-screen overflow-hidden flex flex-col">
      <div class="flex flex-row items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
        <h3 class="text-lg font-medium">Edit CSS</h3>
        <div class="flex gap-2">
          <AppButton type="default" @click="showSearch">
            <div class="flex flex-row items-center gap-2">
              <AppIcon icon="search" class="text-zinc-500 dark:text-zinc-400" />
              <span>Search</span>
            </div>
          </AppButton>
        </div>
      </div>
      <div class="w-full h-full" ref="editornode"></div>
      <div class="flex flex-row items-center place-content-end p-6 gap-3">
        <AppButton type="default" @click.prevent.stop="offcanvas.forceClose()">{{ __("Finished", "flexify-dashboard") }}</AppButton>
        <slot></slot>
      </div>
    </div>
  </OffCanvas>
  <component is="style">
    .ace-xcode, .ace-xcode .ace_gutter, .ace-xcode .ace_gutter-active-line { background: transparent; } .ace_gutter-cell {opacity:0.5} .ace_gutter-cell.ace_gutter-active-line {opacity:1} /* Style the
    search box */ .ace_search { background-color: var(--fd-base-100); border: 1px solid var(--fd-base-200); border-radius: 4px; padding: 8px; } .ace_search_field { border: 1px solid
    var(--fd-base-200); border-radius: 4px; padding: 4px 8px; } .ace_searchbtn { border: 1px solid var(--fd-base-200); border-radius: 4px; padding: 4px 8px; margin: 0 2px; } .ace_searchbtn:hover {
    background-color: var(--fd-base-200); } .dark .ace_search { background-color: var(--fd-base-900); border-color: var(--fd-base-800); } .dark .ace_search_field, .dark .ace_searchbtn {
    border-color: var(--fd-base-800); color: var(--fd-base-200); } .dark .ace_searchbtn:hover { background-color: var(--fd-base-800); } .ace_search.right{ background-color: rgb(var(--fd-base-0));
    border: 1px solid rgb(var(--fd-base-200) / 1); border-top:none; } .dark .ace_search.right{ background-color: rgb(var(--fd-base-900)); border: 1px solid rgb(var(--fd-base-800) / 1);
    border-top:none; }
  </component>
</template>
