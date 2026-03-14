import { OGmenu } from "../state/constants.js";
import { flattenedSubItems } from "./flattenedSubItems.js";

export const returnOriginalLinkAttribute = (link, attribute, fallback) => {
  const id = link.id;

  const existingTopLevel = OGmenu.value.find((item) => item.id == id);
  if (existingTopLevel) {
    return existingTopLevel[attribute] || fallback;
  }

  const existingSubLevel = flattenedSubItems.value.find((item) => item.id == id);
  if (existingSubLevel) {
    return existingSubLevel[attribute] || fallback;
  }
};
