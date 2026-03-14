import { computed } from "vue";

import { posts, openPostParents, expandAllChildren } from "./constants.js";

export const returnPostData = computed(() => {
  const flatten = (postsArray) => {
    let flattened = [];

    postsArray.forEach((post) => {
      flattened.push(post);

      // Check if post has children and is expanded, using .value for refs
      if ((openPostParents.value.includes(post.id) || expandAllChildren.value) && post.children?.length > 0) {
        // Recursively flatten children, which could have their own nested children
        flattened = flattened.concat(flatten(post.children));
      }
    });

    return flattened;
  };

  // Use .value to access the reactive posts array
  return flatten(posts.value);
});
