import { parseExpressions } from "./parseExpressions.ts";
import { getAttributeBindings } from "./getAttributeBindings.ts";
import type { Tag } from "./parseHtmlisp.ts";
import type {
  Components,
  Context,
  HtmllispToHTMLParameters,
} from "../types.ts";
import type { Utilities } from "../../breezewind/types.ts";

// Currently this contains htmlisp syntax specific logic but technically
// that could be decoupled as well.
async function astToHtml(
  ast: (string | Tag)[],
  htmlispToHTML: (args: HtmllispToHTMLParameters) => string,
  context?: Context,
  props?: Context,
  utilities?: Utilities,
  components?: Components,
): Promise<string> {
  return (await Promise.all(ast.map(async (tag) => {
    if (typeof tag === "string") {
      return tag;
    }

    const { name, attributes, children, isSelfClosing } = tag;

    const renderedChildren = await astToHtml(
      children,
      htmlispToHTML,
      context,
      props,
      utilities,
      components,
    );

    // Components begin with an uppercase letter always
    if (components && name[0].toUpperCase() === name[0]) {
      const foundComponent = components[name];

      if (foundComponent) {
        return htmlispToHTML({
          htmlInput: foundComponent,
          components,
          context,
          props: {
            ...Object.fromEntries(
              attributes.map(({ name, value }) => [name, value]),
            ),
            children: renderedChildren,
            props,
          },
          utilities,
        });
      }

      throw new Error(`Component "${name}" was not found!`);
    }

    const parsedExpressions = await parseExpressions(
      attributes,
      context || {},
      props || {},
      utilities || {},
    );

    if (parsedExpressions.visibleIf === false) {
      return "";
    }

    const attrs = getAttributeBindings(parsedExpressions);
    const parsedChildren = parsedExpressions.children;

    if (name !== "noop" && !parsedChildren && isSelfClosing) {
      return `<${name}${attrs}/>`;
    }

    const content = parsedChildren
      ? parsedChildren.concat(renderedChildren)
      : renderedChildren;

    if (name === "noop" && !parsedExpressions.type) {
      return content;
    }

    // TODO: Rename "name" as "type" to be consistent
    const t = parsedExpressions.type || name;

    return `<${t}${attrs}>${content}</${t}>`;
  }))).join("");
}

export { astToHtml };
