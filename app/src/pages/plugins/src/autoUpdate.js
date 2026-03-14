import { lmnFetch } from "@/assets/js/functions/lmnFetch.js";
import { notify } from "@/assets/js/functions/notify.js";

/**
 * Updates given plugin
 *
 */
export const autoUpdate = async (plugin, emit) => {
  const slug = plugin.slug.split("/")[0];

  const args = { endpoint: `flexify-dashboard/v1/plugin/toggle-auto-update/${slug}`, params: {}, type: "POST" };
  const response = await lmnFetch(args);

  if (!response) return false;

  const status = response.data.auto_update_enabled;

  if (status) {
    notify({ title: __("Auto update enabled", "flexify-dashboard"), message: plugin.Title, type: "success" });
  } else {
    notify({ title: __("Auto update disabled", "flexify-dashboard"), message: plugin.Title, type: "success" });
  }
  emit("update", { auto_update_enabled: status });

  return true;
};
