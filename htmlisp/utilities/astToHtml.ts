import type { Tag } from "./parseHtmlisp.ts";

function astToHtml(ast: (string | Tag)[]): string {
  return ast.map((tag) => {
    if (typeof tag === "string") {
      return tag;
    }

    const { name, attributes, children, isSelfClosing } = tag;

    if (isSelfClosing) {
      return `<${name}${convertAttributes(attributes)}/>`;
    }

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
