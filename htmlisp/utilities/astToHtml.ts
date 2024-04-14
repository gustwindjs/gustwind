import { parseExpressions } from "./parseExpressions.ts";
import { getAttributeBindings } from "./getAttributeBindings.ts";
import { isString } from "../../utilities/functional.ts";
import type {
  Components,
  Context,
  Element,
  HtmllispToHTMLParameters,
} from "../types.ts";
import type { Utilities } from "../../types.ts";

// Currently this contains htmlisp syntax specific logic but technically
// that could be decoupled as well.
// TODO: Derive this type from HtmllispToHTMLParameters
async function astToHtml(
  ast: (string | Element)[],
  htmlispToHTML: (args: HtmllispToHTMLParameters) => unknown,
  context?: Context,
  props?: Context,
  initialLocal?: Context,
  utilities?: Utilities,
  componentUtilities?: Record<string, Utilities>,
  components?: Components,
  // Helper for debugging
  parentAst?: (string | Element)[],
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
      type[0]?.toUpperCase() === typeFirstLetter &&
      !type.split("").every((t) => t.toUpperCase() === t);
    let local = initialLocal;

    const parsedAttributes = await parseExpressions(
      attributes,
      { context: context || {}, props: props || {}, local },
      isComponent
        ? { ...utilities, ...componentUtilities?.[type] }
        : utilities
        ? utilities
        : {},
    );

    if (type === "noop") {
      local = parsedAttributes;
    }

    if (
      Object.hasOwn(parsedAttributes, "visibleIf") &&
      (
        parsedAttributes.visibleIf === false ||
        parsedAttributes.visibleIf === undefined ||
        parsedAttributes.visibleIf?.length === 0
      )
    ) {
      return "";
    }

    if (parsedAttributes.foreach) {
      const items = parsedAttributes.foreach as unknown[];

      delete parsedAttributes.foreach;

      renderedChildren = (await Promise.all(
        items.map((p) =>
          astToHtml(
            children,
            htmlispToHTML,
            context,
            // @ts-expect-error This is fine
            { ...p, value: p },
            local,
            utilities,
            componentUtilities,
            components,
            // Pass original ast to help with debugging
            ast,
          )
        ),
      )).join("");
    } else {
      // TODO: Maybe children should remain children and render() should be explicit
      // at the client
      renderedChildren = await astToHtml(
        children,
        htmlispToHTML,
        context,
        props,
        local,
        utilities,
        componentUtilities,
        components,
        // Pass original ast to help with debugging
        ast,
      );

      if (isComponent) {
        const foundComponent = components[type];

        // @ts-expect-error Filter breaks the type here
        const slots: [string | null, string | null][] = await Promise.all(
          children.filter((o) => typeof o !== "string" && o.type === "slot")
            .map(
              async (o) =>
                typeof o !== "string" &&
                [
                  o.attributes?.name,
                  await astToHtml(
                    o.children,
                    htmlispToHTML,
                    context,
                    props,
                    local,
                    utilities,
                    componentUtilities,
                    components,
                    // Pass original ast to help with debugging
                    ast,
                  ),
                ],
            ).filter(Boolean),
        );

        if (!slots.every((s) => s[0])) {
          throw new Error(`Slot is missing a name!`);
        }

        if (foundComponent) {
          return htmlispToHTML({
            htmlInput: foundComponent,
            components,
            context,
            props: {
              children: renderedChildren,
              ...Object.fromEntries(slots),
              ...attributes,
              ...parsedAttributes,
              props,
            },
            utilities: { ...utilities, ...componentUtilities?.[type] },
            componentUtilities,
          });
        }

        console.error({ parentAst, ast });
        throw new Error(`Component "${type}" was not found!`);
      }
    }

    const parsedChildren = parsedAttributes.children;

    if (type !== "noop" && !parsedChildren && typeof closesWith === "string") {
      return `<${type}${getAttributeBindings(parsedAttributes)}${closesWith}>`;
    }

    // TODO: Should there be a more strict check against parsed children?
    const content = isString(parsedChildren)
      ? parsedChildren.concat(renderedChildren)
      : renderedChildren;

    if (type === "noop" && !parsedAttributes.type) {
      return content;
    }

    const t = type === "noop" && parsedAttributes.type || type;

    if (t) {
      if (type === "noop") {
        delete parsedAttributes.type;
      }

      return `<${t}${getAttributeBindings(parsedAttributes)}>${content}</${t}>`;
    }

    return content;
  }))).join("");
}

export { astToHtml };
