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
export const deleting = ref(false);

export const batchDeletePosts = async () => {
  if (!selected.value.length) return;

  // Confirm user intent
  const userResponse = await confirm.value.show({
    title: __("Are you sure?", "flexify-dashboard"),
    message: __("Are you sure you want to delete these items? This action cannot be undone.", "flexify-dashboard"),
    okButton: __("Yes delete them", "flexify-dashboard"),
  });

  // Bailed by user
  if (!userResponse) return;

  deleting.value = true;

  for (let itemID of selected.value) {
    const post = returnPostData.value.find((item) => item.id == itemID);

    if (!post) continue;

    const args = { endpoint: `wp/v2/${post.rest_base}/${post.id}`, params: { force: post.single_status == "trash" ? true : false }, type: "DELETE" };
    const response = await lmnFetch(args);

    // Something went wrong
    if (!response) continue;
  }

  deleting.value = false;

  notify({ type: "success", title: __("Items deleted", "flexify-dashboard") });
  fetchPostsData(true);
  selected.value = [];
};
