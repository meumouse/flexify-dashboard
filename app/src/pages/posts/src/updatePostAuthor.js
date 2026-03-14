import { ref } from "vue";
import { selected, posts, currentPostType } from "./constants.js";

// Functions
import { lmnFetch } from "@/assets/js/functions/lmnFetch.js";
import { notify } from "@/assets/js/functions/notify.js";
import { fetchPostsData } from "./fetchPostsData.js";

export const updatePostAuthor = async (post) => {
  if (!post) return;

  if (!post.author.id) return;

  const args = { endpoint: `wp/v2/${currentPostType.value.rest_base}/${post.id}`, params: {}, data: { author: post.author.id }, type: "POST" };
  const response = await lmnFetch(args);

  // Something went wrong
  if (!response) return;

  notify({ type: "success", title: __("Item author updated", "flexify-dashboard") });

  fetchPostsData(true);
};
