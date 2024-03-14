import type { Tag } from "./parseHtmlisp.ts";

function astToHtml(ast: (string | Tag)[]): string {
  return ast.map((v) => {
    if (typeof v === "string") {
      return v;
    }

    const { name, attributes, children } = v;

    return `<${name}${convertAttributes(attributes)}>${
      astToHtml(children)
    }</${name}>`;
  }).join("");
}

function convertAttributes(attributes: Tag["attributes"]): string {
  const ret = attributes.map(({ name, value }) => {
    // Skip comments
    if (name.startsWith("__")) {
      return;
    }

    return `${name}="${value}"`;
  }).filter(Boolean).join(" ");

  if (ret.length) {
    return " " + ret;
  }

  return "";
}

export { astToHtml };
