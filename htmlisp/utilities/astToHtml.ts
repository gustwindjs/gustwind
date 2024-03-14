import type { Tag } from "./parseHtmlisp.ts";

function astToHtml(ast: Tag[]) {
  return ast.map(({ name, attributes, children }) =>
    `<${name}${convertAttributes(attributes)}>${children}</${name}>`
  ).join("");
}

function convertAttributes(attributes: Tag["attributes"]) {
  return attributes.map(({ name, value }) => {
    // Skip comments
    if (name.startsWith("__")) {
      return;
    }

    return `${name}="${value}"`;
  }).filter(Boolean).join(" ");
}

export { astToHtml };
