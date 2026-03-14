import { ref } from "vue";
import { selected, posts, currentPostType } from "./constants.js";

// Functions
import { lmnFetch } from "@/assets/js/functions/lmnFetch.js";
import { notify } from "@/assets/js/functions/notify.js";

// Computed
import { returnPostData } from "./returnPostData.js";

export const inlineTitleUpdate = async (evt, postID) => {
  if (!postID) return;

  const newValue = evt.target.innerHTML.trim();
  const currentPost = returnPostData.value.find((item) => item.id == postID);

  if (currentPost.title.value === newValue) return;

  if (!newValue) return;

  const args = { endpoint: `wp/v2/${currentPostType.value.rest_base}/${postID}`, params: {}, data: { title: newValue }, type: "POST" };
  const response = await lmnFetch(args);

  // Something went wrong
  if (!response) return;

  notify({ type: "success", title: __("Item title updated", "flexify-dashboard") });
};
