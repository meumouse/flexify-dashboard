import { ref, computed, watch } from "vue";
import { useAppStore } from "@/store/app/app.js";

const prefersDark = ref(false);
const userPreference = ref("system");
const listenersMounted = ref(false);
let mediaQuery = null;
let appStore;

// Define globalOverride before updateColorScheme so it's available when needed
const globalOverride = computed(() => {
  if (!appStore) {
    appStore = useAppStore();
  }

  const isOverride = appStore?.state?.flexify_dashboard_settings?.force_global_theme;

  return isOverride == "off" || !isOverride ? false : isOverride;
});

const updateColorScheme = () => {
  // Check for global override first - this takes precedence over everything
  if (globalOverride.value) {
    prefersDark.value = globalOverride.value === "dark";
    return;
  }

  // No global override, use user preference or system preference
  const isDarkMode = userPreference.value === "dark" || (userPreference.value === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  prefersDark.value = isDarkMode;
};

const setColorScheme = (newScheme, dontDispatchChange) => {
  if (["light", "dark", "system"].includes(newScheme)) {
    userPreference.value = newScheme;
    localStorage.setItem("uipc_theme", newScheme);
    updateColorScheme();

    // Dispatch change for VendBase
    if (!dontDispatchChange) {
      const themeUpdateEvent = new CustomEvent("flexify-dashboard-theme-update", { detail: newScheme });
      document.dispatchEvent(themeUpdateEvent);
    }
  }
};

export const setupColorScheme = () => {
  userPreference.value = localStorage.getItem("uipc_theme") || "system";
  updateColorScheme();

  if (window.matchMedia) {
    mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", updateColorScheme);
  }
};

export const cleanupColorScheme = () => {
  if (mediaQuery) {
    mediaQuery.removeEventListener("change", updateColorScheme);
  }
};

export const useColorScheme = () => {
  if (!listenersMounted.value) {
    listenersMounted.value = true;
    document.addEventListener("flexify-dashboard-theme-update", (evt) => {
      if (!evt.detail) return;
      setColorScheme(evt.detail, true);
    });

    // Watch for changes to globalOverride and update prefersDark accordingly
    watch(globalOverride, () => {
      updateColorScheme();
    }, { immediate: false });
  }

  const colorScheme = computed(() => {
    // Global override
    if (globalOverride.value) return globalOverride.value;

    if (userPreference.value !== "system") {
      return userPreference.value;
    }
    return prefersDark.value ? "dark" : "light";
  });

  return {
    prefersDark,
    colorScheme,
    setColorScheme,
    userPreference,
    globalOverride,
  };
};
