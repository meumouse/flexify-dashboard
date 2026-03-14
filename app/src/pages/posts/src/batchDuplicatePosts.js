import { ref } from "vue";
import { selected, posts } from "./constants.js";

// Functions
import { lmnFetch } from "@/assets/js/functions/lmnFetch.js";
import { notify } from "@/assets/js/functions/notify.js";
import { fetchPostsData } from "./fetchPostsData.js";
import { getPost } from "./getPost.js";

// Computed
import { returnPostData } from "./returnPostData.js";

// Refs
export const duplicating = ref(false);

export const batchDuplicatePosts = async () => {
  if (!selected.value.length) return;

  duplicating.value = true;

  for (let itemID of selected.value) {
    const post = returnPostData.value.find((item) => item.id == itemID);
    const postData = await getPost(post);

    if (!post || !postData) continue;

    const title = `${postData.title.raw} (copy)`;

    const data = { ...postData };
    delete data.id;
    delete data.date;
    delete data.date_gmt;
    delete data.title;

    data.title = title;
    data.status = "draft";

    const args = { endpoint: `wp/v2/${post.rest_base}`, params: {}, type: "POST", data };
    const response = await lmnFetch(args);

    // Something went wrong
    if (!response) continue;
  }

  duplicating.value = false;

  notify({ type: "success", title: __("Items duplicated", "flexify-dashboard") });
  fetchPostsData(true);
  selected.value = [];
};
