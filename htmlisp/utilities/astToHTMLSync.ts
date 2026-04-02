import { parseExpressionsSync } from "./parseExpressionsSync.ts";
import { renderElement } from "./renderElement.ts";
import type {
  Components,
  Context,
  Element,
  HtmlispRenderOptions,
  HtmllispToHTMLParameters,
} from "../types.ts";
import type { Utilities } from "../../types.ts";
import { raw, renderTextValue } from "./runtime.ts";
import { isForeachBinding } from "./parseForeachExpression.ts";

// Currently this contains htmlisp syntax specific logic but technically
// that could be decoupled as well.
// TODO: Derive this type from HtmllispToHTMLParameters
function astToHTMLSync(
  ast: (string | Element)[],
  htmlispToHTML: (args: HtmllispToHTMLParameters) => unknown,
  context?: Context,
  props?: Context,
  initialLocal?: Context,
  utilities?: Utilities,
  componentUtilities?: Record<string, Utilities>,
  components?: Components,
  renderOptions?: HtmlispRenderOptions,
  // Helper for debugging
  parentAst?: (string | Element)[],
): string {
  return ast.map((tag) => {
    if (typeof tag === "string") {
      return renderTextValue(tag, renderOptions);
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

    const parsedAttributes = parseExpressionsSync(
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

    let renderedChildren = "";
    if (parsedAttributes.foreach) {
      const foreachBinding = isForeachBinding(parsedAttributes.foreach)
        ? parsedAttributes.foreach
        : { items: parsedAttributes.foreach as unknown[] };
      const { items, alias } = foreachBinding;

      delete parsedAttributes.foreach;

      // TODO: Test this case
      if (!Array.isArray(items)) {
        console.error(items);
        throw new Error("foreach - Tried to iterate a non-array!");
      }

      renderedChildren = items.map((p) =>
        astToHTMLSync(
          children,
          htmlispToHTML,
          context,
          createForeachProps(props, p, alias),
          local,
          utilities,
          componentUtilities,
          components,
          renderOptions,
          // Pass original ast to help with debugging
          ast,
        )
      ).join("");
    } else {
      renderedChildren = astToHTMLSync(
        children,
        htmlispToHTML,
        context,
        props,
        local,
        utilities,
        componentUtilities,
        components,
        renderOptions,
        // Pass original ast to help with debugging
        ast,
      );

      if (isComponent) {
        const foundComponent = components[type];

        if (!foundComponent) {
          console.error({ parentAst, ast });
          throw new Error(`Component "${type}" was not found!`);
        }

        const componentSlots = slotsToPropsSync(
          ast,
          tag,
          htmlispToHTML,
          context,
          props,
          local,
          utilities,
          componentUtilities,
          components,
          renderOptions,
          typeof foundComponent !== "function",
        );
        const componentProps = {
          children: typeof foundComponent === "function"
            ? renderedChildren
            : raw(renderedChildren),
          ...attributes,
          ...parsedAttributes,
          ...componentSlots,
          props,
          utilities,
          componentUtilities,
          components,
        };
        const renderedComponent = typeof foundComponent === "function"
          ? foundComponent(componentProps)
          : foundComponent;

        if (renderedComponent instanceof Promise) {
          throw new Error(
            `Component "${type}" returned a Promise in sync rendering`,
          );
        }

        return htmlispToHTML({
          htmlInput: renderedComponent,
          components,
          context,
          props: componentProps,
          utilities: { ...utilities, ...componentUtilities?.[type] },
          componentUtilities,
          renderOptions,
        });
      }
    }

    return renderElement(
      parsedAttributes,
      tag,
      renderedChildren,
      renderOptions,
    );
  }).join("");
}

function slotsToPropsSync(
  ast: (string | Element)[],
  tag: Element,
  htmlispToHTML: (args: HtmllispToHTMLParameters) => unknown,
  context?: Context,
  props?: Context,
  local?: Context,
  utilities?: Utilities,
  componentUtilities?: Record<string, Utilities>,
  components?: Components,
  renderOptions?: HtmlispRenderOptions,
  wrapRenderedOutput?: boolean,
) {
  const { children } = tag;

  // @ts-expect-error Filter breaks the type here
  const slots: [string | null, string | null][] = children.filter((o) =>
    typeof o !== "string" && o.type === "slot"
  )
    .map(
      (o) =>
        typeof o !== "string" &&
        [
          o.attributes?.name,
          astToHTMLSync(
            o.children,
            htmlispToHTML,
            context,
            props,
            local,
            utilities,
            componentUtilities,
            components,
            renderOptions,
            // Pass original ast to help with debugging
            ast,
          ),
        ],
    ).filter(Boolean);

  if (!slots.every((s) => s[0])) {
    throw new Error(`Slot is missing a name!`);
  }

  return Object.fromEntries(
    slots.map((
      [name, value],
    ) => [name, wrapRenderedOutput ? raw(value) : value]),
  );
}

export { astToHTMLSync };

function createForeachProps(
  props: Context | undefined,
  item: unknown,
  alias?: string,
) {
  const loopProps: Context = {
    ...(props || {}),
    value: item,
  };

  if (item && typeof item === "object" && !Array.isArray(item)) {
    Object.assign(loopProps, item);
  }

  if (alias) {
    loopProps[alias] = item;
  }

  return loopProps;
}
