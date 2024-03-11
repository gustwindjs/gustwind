import { isObject, omit } from "../utilities/functional.ts";
import { parseExpression } from "./utilities/parseExpression.ts";
import { defaultUtilities } from "../breezewind/defaultUtilities.ts";

type Attributes = Record<string, string> | null;
type Components = Record<string, string>;
type Context = Record<string, unknown>;
type Utilities = Record<string, (...args: any) => unknown>;

function getConverter(
  htm: { bind: (hValue: ReturnType<typeof getH>) => string },
) {
  return function htmlispToHTML(
    { htmlInput, components, context, utilities }: {
      htmlInput?: string;
      components?: Components;
      context?: Context;
      utilities?: Utilities;
    },
  ): string {
    if (!htmlInput) {
      throw new Error("convert - Missing html input");
    }

    if (htmlInput.startsWith("<!") || htmlInput.startsWith("<?")) {
      return htmlInput;
    }

    const html = htm.bind(
      getH(components || {}, context || {}, {
        ...defaultUtilities,
        ...utilities,
      }),
    );

    // @ts-ignore Ignore for now
    return html([htmlInput]);
  };
}

function getH(components: Components, context: Context, utilities: Utilities) {
  return function h(
    type: string,
    attributes: Attributes,
    ...children: string[]
  ) {
    // Components begin with an uppercase letter always
    if (type[0].toUpperCase() === type[0]) {
      const foundComponent = components[type];

      if (foundComponent) {
        // TODO: 1. Get props
        // TODO: 2. Execute match (same function but with props as context)

        const childrenAttribute = attributes?.["&children"] as string;

        // TODO: Handle other & attributes
        if (childrenAttribute) {
          const parsedExpression = parseExpression(childrenAttribute);

          console.log("got parsed children expression", parsedExpression);
        }

        // TODO: Handle bindings within found component definitions somehow
        return "<button>foo</button>";
      }

      throw new Error(`Component "${type}" was not found!`);
    }

    // TODO: Add expression parsing logic and context execution logic here
    const attrs = getAttributeBindings(attributes, context, utilities);

    return `<${type}${attrs && " " + attrs}>${children}</${type}>`;
  };
}

function getAttributeBindings(
  attributes: Attributes,
  context: Context,
  utilities: Utilities,
) {
  if (!attributes) {
    return "";
  }

  return Object.entries(attributes).map(
    ([k, v]) => {
      // Skip commented attributes
      if (k.startsWith("__")) {
        return;
      }

      // Check bindings
      if (k.startsWith("&")) {
        const parsedExpression = parseExpression(v);

        // TODO: Test this case
        if (!parsedExpression) {
          throw new Error(`Failed to parse ${v} for attribute ${k}!`);
        }

        const { utility, parameters } = parsedExpression;

        return `${k.slice(1)}="${
          utilities[utility].apply(
            // TODO: Clarify global "context" vs. component "props"
            // -> rename context as props? Is it important to have both?
            { context: { props: context } },
            parameters,
          )
        }"`;
      }

      return `${k}="${v}"`;
    },
  ).filter(Boolean).join(" ");
}

export { getConverter };
