import { ref } from "vue";
import { selected, posts, confirm } from "./constants.js";

// Functions
import { lmnFetch } from "@/assets/js/functions/lmnFetch.js";
import { notify } from "@/assets/js/functions/notify.js";
import { fetchPostsData } from "./fetchPostsData.js";
import { getPost } from "./getPost.js";

// Computed
import { returnPostData } from "./returnPostData.js";

// Refs
export const publishing = ref(false);

export const batchPublishPosts = async () => {
  if (!selected.value.length) return;

  // Confirm user intent
  const userResponse = await confirm.value.show({
    title: __("Are you sure?", "flexify-dashboard"),
    message: __("Are you sure you want to publish these items?", "flexify-dashboard"),
    okButton: __("Yes publish them", "flexify-dashboard"),
  });

  // Bailed by user
  if (!userResponse) return;

  publishing.value = true;

  for (let itemID of selected.value) {
    const post = returnPostData.value.find((item) => item.id == itemID);

    if (!post) continue;

    const args = { endpoint: `wp/v2/${post.rest_base}/${post.id}`, params: {}, data: { status: "publish" }, type: "POST" };
    const response = await lmnFetch(args);

    // Something went wrong
    if (!response) continue;
  }

  publishing.value = false;

  notify({ type: "success", title: __("Items published", "flexify-dashboard") });
  fetchPostsData(true);
  selected.value = [];
};
