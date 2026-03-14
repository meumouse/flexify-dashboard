import { image as defaultImage } from "./image.js";
import { font as defaultFont } from "./font.js";
import { pdf as defaultPDF } from "./pdf.js";
import { zip as defaultZip } from "./zip.js";
import { text as defaultText } from "./text.js";

/**
 * summary
 *
 * @param {type} post - description
 * @param {type} preferredSize - description
 */
export const extractMediaLink = (post, preferredSize) => {
  if (!post) return defaultImage;

  const mime_type = post.mime_type;
  const media_type = post.media_type;

  let defaultIcon = returnMimePlaceholder(mime_type);

  // Not an image so return a placeholder
  if (media_type && media_type != "image") return defaultIcon;

  // No details so no sizes so return full
  if (!("media_details" in post)) return post.source_url;

  // Try for sizes
  if (!("sizes" in post.media_details)) return post.source_url;
  const sizes = post.media_details.sizes;

  // Medium
  if (preferredSize && preferredSize in sizes) return sizes[preferredSize].source_url;

  // Medium
  if ("medium" in sizes) return sizes.medium.source_url;
  // Medium Large
  if ("medium_large" in sizes) return sizes.medium_large.source_url;
  //  Large
  if ("large" in sizes) return sizes.large.source_url;
  //  Large
  if ("full" in sizes) return sizes.full.source_url;
  //  Fallback
  if ("thumbnail" in sizes) return sizes.thumbnail.source_url;
  //  Double Fallback
  const fallBack = sizes[Object.keys(sizes)[0]] || post.source_url;
  return fallBack ? fallBack : defaultIcon;
};

export const returnMimePlaceholder = (mime_type) => {
  let defaultIcon = defaultImage;
  if (mime_type) {
    if (mime_type.includes("font")) defaultIcon = defaultFont;
    if (mime_type.includes("zip")) defaultIcon = defaultZip;
    if (mime_type.includes("pdf")) defaultIcon = defaultPDF;
    if (mime_type.includes("text")) defaultIcon = defaultText;
  }

  return defaultIcon;
};
