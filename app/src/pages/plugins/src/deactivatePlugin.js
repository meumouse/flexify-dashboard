import { ref } from "vue";
import { lmnFetch } from "@/assets/js/functions/lmnFetch.js";
import { notify } from "@/assets/js/functions/notify.js";
import { updatePluginData } from "./updatePluginData.js";

export const deactivating = ref(false);

/**
 * Updates given plugin
 *
 */
export const deactivatePlugin = async (plugin, emit) => {
  deactivating.value = true;

  const slug = plugin.slug.split("/")[0];

  const args = { endpoint: `flexify-dashboard/v1/plugin/deactivate/${slug}`, params: {}, type: "POST" };
  const response = await lmnFetch(args);

  deactivating.value = false;

  if (!response) return false;

  notify({ title: __("Plugin deactivated", "flexify-dashboard"), message: plugin.Title, type: "success" });
  //emit("update", { active: false });
  updatePluginData(plugin, { active: false });

  // Dispatch event to allow other Flexify Dashboard components update correctly
  const pluginEvent = new CustomEvent("flexify-dashboard-plugin-deactivated", { detail: slug });
  document.dispatchEvent(pluginEvent);

  return true;
};
