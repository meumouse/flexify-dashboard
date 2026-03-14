import { ref } from "vue";
import { posts, currentPostType } from "./constants.js";

// Functions
import { lmnFetch } from "@/assets/js/functions/lmnFetch.js";
import { notify } from "@/assets/js/functions/notify.js";
import { fetchPostsData } from "./fetchPostsData.js";

export const updatePostStatus = async (post, status) => {
  if (!post || !status) return;

  const args = { endpoint: `wp/v2/${currentPostType.value.rest_base}/${post.id}`, params: {}, data: { status: status.value }, type: "POST" };
  const response = await lmnFetch(args);

  // Something went wrong
  if (!response) return;

  notify({ type: "success", title: __("Item status updated", "flexify-dashboard") });

  fetchPostsData(true);
};
