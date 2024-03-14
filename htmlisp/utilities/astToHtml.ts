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
  htmlispToHTML: (args: HtmllispToHTMLParameters) => unknown,
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

    const parsedExpressions = await parseExpressions(
      attributes,
      context || {},
      props || {},
      utilities || {},
    );

    // Components begin with an uppercase letter always
    if (components && name[0].toUpperCase() === name[0]) {
      const foundComponent = components[name];

      const slots = await Promise.all(
        children.filter((o) => typeof o !== "string" && o.name === "slot").map(
          async (o) =>
            typeof o !== "string" &&
            ({
              name: o.attributes[0].value,
              value: await astToHtml(
                o.children,
                htmlispToHTML,
                context,
                props,
                utilities,
                components,
              ),
            }),
        ).filter(Boolean),
      );

      // @ts-expect-error This is fine
      if (!slots.every((s) => s.name)) {
        throw new Error(`Slot is missing a name!`);
      }

      if (foundComponent) {
        return htmlispToHTML({
          htmlInput: foundComponent,
          components,
          context,
          props: {
            children: renderedChildren,
            ...Object.fromEntries(
              // @ts-expect-error This is fine
              slots.concat(attributes).map(({ name, value }) => [name, value]),
            ),
            ...parsedExpressions,
            props,
          },
          utilities,
        });
      }

      throw new Error(`Component "${name}" was not found!`);
    }

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
