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
// TODO: Derive this type from HtmllispToHTMLParameters
async function astToHtml(
  ast: (string | Tag)[],
  htmlispToHTML: (args: HtmllispToHTMLParameters) => unknown,
  context?: Context,
  props?: Context,
  utilities?: Utilities,
  componentUtilities?: Record<string, Utilities>,
  components?: Components,
): Promise<string> {
  return (await Promise.all(ast.map(async (tag) => {
    if (typeof tag === "string") {
      return tag;
    }

    const { type, attributes, children, closesWith } = tag;
    let renderedChildren = "";

    // Components begin with an uppercase letter always but not with ! or ?
    // Component names aren't also fully in uppercase
    const typeFirstLetter = type[0];
    const isComponent = !["!", "?"].some((s) => s === typeFirstLetter) &&
      components &&
      type[0].toUpperCase() === typeFirstLetter &&
      !type.split("").every((t) => t.toUpperCase() === t);

    const parsedExpressions = await parseExpressions(
      attributes,
      context || {},
      props || {},
      isComponent
        ? { ...utilities, ...componentUtilities?.[type] }
        : utilities
        ? utilities
        : {},
    );

    if (parsedExpressions.visibleIf === false) {
      return "";
    }

    if (parsedExpressions.foreach) {
      const items = parsedExpressions.foreach as unknown[];

      delete parsedExpressions.foreach;

      renderedChildren = (await Promise.all(
        items.map((p) =>
          astToHtml(
            children,
            htmlispToHTML,
            context,
            // @ts-expect-error This is fine
            { ...p, item: p },
            utilities,
            componentUtilities,
            components,
          )
        ),
      )).join("");
    } else {
      renderedChildren = await astToHtml(
        children,
        htmlispToHTML,
        context,
        props,
        utilities,
        componentUtilities,
        components,
      );

      if (isComponent) {
        const foundComponent = components[type];

        // @ts-expect-error Filter breaks the type here
        const slots: { name: string | null; value: string | null }[] =
          await Promise.all(
            children.filter((o) => typeof o !== "string" && o.type === "slot")
              .map(
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
                      componentUtilities,
                      components,
                    ),
                  }),
              ).filter(Boolean),
          );

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
                slots.concat(attributes).map((
                  { name, value },
                ) => [name, value]),
              ),
              ...parsedExpressions,
              props,
            },
            utilities: { ...utilities, ...componentUtilities?.[type] },
            componentUtilities,
          });
        }

        throw new Error(`Component "${type}" was not found!`);
      }
    }

    const attrs = getAttributeBindings(parsedExpressions);
    const parsedChildren = parsedExpressions.children;

    if (type !== "noop" && !parsedChildren && typeof closesWith === "string") {
      return `<${type}${attrs}${closesWith}>`;
    }

    const content = parsedChildren
      ? parsedChildren.concat(renderedChildren)
      : renderedChildren;

    if (type === "noop" && !parsedExpressions.type) {
      return content;
    }

    const t = parsedExpressions.type || type;

    return `<${t}${attrs}>${content}</${t}>`;
  }))).join("");
}

export { astToHtml };
