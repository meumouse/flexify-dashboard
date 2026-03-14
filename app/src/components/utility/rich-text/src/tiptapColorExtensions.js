import { Mark } from "@tiptap/core";

export const BackgroundColor = Mark.create({
  name: "backgroundColor",

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.style.backgroundColor,
        renderHTML: (attributes) => {
          if (!attributes.color) {
            return {};
          }
          return {
            style: `background-color: ${attributes.color}`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        style: "background-color",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0];
  },

  addCommands() {
    return {
      setBackgroundColor:
        (color) =>
        ({ chain }) => {
          return chain().setMark("backgroundColor", { color }).run();
        },
      unsetBackgroundColor:
        () =>
        ({ chain }) => {
          return chain().unsetMark("backgroundColor").run();
        },
    };
  },
});
