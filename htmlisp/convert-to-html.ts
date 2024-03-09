import { isObject, omit } from "../utilities/functional.ts";
import { parseExpression } from "./utilities/parseExpression.ts";

type Attributes = Record<string, unknown> | null;

function getConverter(htm: { bind: (hValue: typeof h) => string }) {
  const html = htm.bind(h);

  return function htmlispToBreezewind(
    htmlInput?: string,
  ): string {
    if (!htmlInput) {
      throw new Error("convert - Missing html input");
    }

    if (htmlInput.startsWith("<!") || htmlInput.startsWith("<?")) {
      return htmlInput;
    }

    // @ts-ignore Ignore for now
    return html([htmlInput]);
  };
}

function h(
  type: string,
  attributes: Attributes,
  ...children: string[]
) {
  return `<${type} ${getAttributeBindings(attributes)}>${children}</${type}>`;
}

function getAttributeBindings(attributes: Attributes) {
  if (!attributes) {
    return "";
  }

  return Object.entries(attributes).map(
    ([k, v]) => `${k}="${v}"`,
  ).join(" ");
}

export { getConverter };
