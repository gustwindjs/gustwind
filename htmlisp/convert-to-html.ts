import { isObject, omit } from "../utilities/functional.ts";
import { parseExpression } from "./utilities/parseExpression.ts";

type Attributes = Record<string, string> | null;
type Components = Record<string, string>;

function getConverter(
  htm: { bind: (hValue: ReturnType<typeof getH>) => string },
) {
  return function htmlispToBreezewind(
    htmlInput?: string,
    components?: Components,
  ): string {
    if (!htmlInput) {
      throw new Error("convert - Missing html input");
    }

    if (htmlInput.startsWith("<!") || htmlInput.startsWith("<?")) {
      return htmlInput;
    }

    const html = htm.bind(getH(components || {}));

    // @ts-ignore Ignore for now
    return html([htmlInput]);
  };
}

function getH(components: Components) {
  return function h(
    type: string,
    attributes: Attributes,
    ...children: string[]
  ) {
    if (components[type]) {
      const childrenAttribute = attributes?.["&children"] as string;

      // TODO: Handle other & attributes
      if (childrenAttribute) {
        const parsedExpression = parseExpression(childrenAttribute);

        console.log("got parsed children expression", parsedExpression);
      }

      // TODO: Handle bindings within found component definitions somehow
      return "<button>foo</button>";
    }

    const attrs = getAttributeBindings(attributes);

    return `<${type}${attrs && " " + attrs}>${children}</${type}>`;
  };

  function getAttributeBindings(attributes: Attributes) {
    if (!attributes) {
      return "";
    }

    return Object.entries(attributes).map(
      ([k, v]) => !k.startsWith("__") && `${k}="${v}"`,
    ).filter(Boolean).join(" ");
  }
}

export { getConverter };
