import { parseExpressions } from "./parseExpressions.ts";
import { renderElement } from "./renderElement.ts";
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
async function astToHTML(
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

    const { type, attributes, children } = tag;

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

    let renderedChildren = Promise.resolve("");
    if (parsedAttributes.foreach) {
      const items = parsedAttributes.foreach as unknown[];

      delete parsedAttributes.foreach;

      // TODO: Test this case
      if (!Array.isArray(items)) {
        console.error(items);
        throw new Error("foreach - Tried to iterate a non-array!");
      }

      renderedChildren = Promise.all(
        items.map((p) =>
          astToHTML(
            children,
            htmlispToHTML,
            context,
            // @ts-expect-error This is fine
            { ...props, ...p, value: p },
            local,
            utilities,
            componentUtilities,
            components,
            // Pass original ast to help with debugging
            ast,
          )
        ),
      ).then((a) => a.join(""));
    } else {
      renderedChildren = astToHTML(
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

        if (!foundComponent) {
          console.error({ parentAst, ast });
          throw new Error(`Component "${type}" was not found!`);
        }

        return htmlispToHTML({
          htmlInput: foundComponent,
          components,
          context,
          props: {
            children: renderedChildren,
            ...attributes,
            ...parsedAttributes,
            ...await slotsToProps(
              ast,
              tag,
              htmlispToHTML,
              context,
              props,
              local,
              utilities,
              componentUtilities,
              components,
            ),
            props,
            utilities,
            componentUtilities,
            components,
          },
          utilities: { ...utilities, ...componentUtilities?.[type] },
          componentUtilities,
        });
      }
    }

    return renderElement(parsedAttributes, tag, await renderedChildren);
  }))).join("");
}

async function slotsToProps(
  ast: (string | Element)[],
  tag: Element,
  htmlispToHTML: (args: HtmllispToHTMLParameters) => unknown,
  context?: Context,
  props?: Context,
  local?: Context,
  utilities?: Utilities,
  componentUtilities?: Record<string, Utilities>,
  components?: Components,
) {
  const { children } = tag;

  // @ts-expect-error Filter breaks the type here
  const slots: [string | null, string | null][] = await Promise.all(
    children.filter((o) => typeof o !== "string" && o.type === "slot")
      .map(
        async (o) =>
          typeof o !== "string" &&
          [
            o.attributes?.name,
            await astToHTML(
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

  return Object.fromEntries(slots);
}

export { astToHTML };
