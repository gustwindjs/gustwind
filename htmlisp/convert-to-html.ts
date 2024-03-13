import { omit } from "../utilities/functional.ts";
import { parseExpression } from "./utilities/parseExpression.ts";
import { defaultUtilities } from "../breezewind/defaultUtilities.ts";
import { applyUtility } from "../breezewind/applyUtility.ts";
import type { Utilities, Utility } from "../breezewind/types.ts";

type Attributes = Record<string, string> | null;
type Components = Record<string, string>;
type Context = Record<string, unknown>;
// type Utilities = Record<string, (...args: any) => unknown>;
type HtmllispToHTMLParameters = {
  htmlInput?: string;
  components?: Components;
  context?: Context;
  props?: Context;
  utilities?: Utilities;
};

function getConverter(
  htm: { bind: (hValue: ReturnType<typeof getH>) => string },
) {
  return function htmlispToHTML(
    { htmlInput, components, context, props, utilities }:
      HtmllispToHTMLParameters,
  ): string {
    if (!htmlInput) {
      throw new Error("convert - Missing html input");
    }

    if (htmlInput.startsWith("<!") || htmlInput.startsWith("<?")) {
      return htmlInput;
    }

    const html = htm.bind(
      getH(
        components || {},
        context || {},
        props || {},
        // @ts-expect-error TODO: Figure out what's wrong with this type
        {
          ...defaultUtilities,
          ...utilities,
        },
        htmlispToHTML,
      ),
    );

    // @ts-ignore Ignore for now
    return html([htmlInput]);
  };
}

function getH(
  components: Components,
  context: Context,
  props: Context,
  utilities: Utilities,
  htmlispToHTML: (args: HtmllispToHTMLParameters) => string,
) {
  return async function h(
    type: string,
    attributes: Attributes,
    ...children: string[]
  ) {
    // Components begin with an uppercase letter always
    if (type[0].toUpperCase() === type[0]) {
      const foundComponent = components[type];

      if (foundComponent) {
        let additionalProps = {};
        let awaitedChildren = [""];

        // Due to iteration order htm goes to the branches first
        // and those will be missing props. The code below works
        // around the problem by trying again.
        try {
          awaitedChildren = await Promise.all(children);
        } catch (_error) {
          // Nothing to do
        }

        // Children are slots if the results was an array of tuples
        if (
          Array.isArray(awaitedChildren) && awaitedChildren[0]?.length === 2
        ) {
          // @ts-expect-error This is fine
          additionalProps = Object.fromEntries(awaitedChildren);
          awaitedChildren = [""];
        }

        return htmlispToHTML({
          htmlInput: foundComponent,
          components,
          context,
          props: {
            children: awaitedChildren,
            ...additionalProps,
            ...attributes,
            ...await parseExpressions(attributes, context, props, utilities),
          },
        });
      }

      throw new Error(`Component "${type}" was not found!`);
    }

    if (attributes?.["&visibleIf"]) {
      const showElement = await applyUtility<Utility, Utilities, Context>(
        parseExpression(attributes["&visibleIf"]),
        utilities,
        { context },
      );

      if (!showElement) {
        return "";
      }
    }

    const parsedExpressions = await parseExpressions(
      attributes,
      context,
      props,
      utilities,
    );

    const attrs = await getAttributeBindings(
      omit(omit(parsedExpressions, "children"), "type"),
    );

    if (attributes?.["&children"]) {
      children = await applyUtility<Utility, Utilities, Context>(
        parseExpression(attributes["&children"]),
        utilities,
        { context, props },
      );
    }

    const content = Array.isArray(children)
      ? (await Promise.all(children)).join("")
      : "";

    if (type === "slot") {
      const name = attributes?.name;

      if (!name) {
        throw new Error(`Slot is missing a name!`);
      }

      return [name, content];
    }

    if (!parsedExpressions.type && type === "noop") {
      return content;
    }

    return `<${parsedExpressions.type || type}${
      attrs && " " + attrs
    }>${content}</${parsedExpressions.type || type}>`;
  };
}

function getAttributeBindings(
  parsedExpressions: Awaited<ReturnType<typeof parseExpressions>>,
) {
  return Object.entries(parsedExpressions).map(([k, v]) => `${k}="${v}"`)
    .join(" ");
}

async function parseExpressions(
  attributes: Attributes,
  context: Context,
  props: Context,
  utilities: Utilities,
) {
  if (!attributes) {
    return {};
  }

  const entries = (await Promise.all(
    Object.entries(attributes).map(
      async ([k, v]) => {
        // Skip commented attributes
        if (k.startsWith("__")) {
          return;
        }

        // Skip visibleIf
        if (k === "&visibleIf") {
          return;
        }

        // Check bindings
        if (k.startsWith("&")) {
          const parsedExpression = parseExpression(v);

          // TODO: Test this case
          if (!parsedExpression) {
            throw new Error(`Failed to parse ${v} for attribute ${k}!`);
          }

          return [
            k.slice(1),
            await applyUtility<
              Utility,
              Utilities,
              Context
            >(
              parsedExpression,
              utilities,
              { context, props },
            ),
          ];
        }

        return [k, v];
      },
    ),
  )).filter(Boolean);

  // @ts-expect-error This is fine
  return Object.fromEntries(entries);
}

export { getConverter };
