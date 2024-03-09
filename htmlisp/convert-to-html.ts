import { isObject, omit } from "../utilities/functional.ts";
import { parseExpression } from "./utilities/parseExpression.ts";

function getConverter(htm: { bind: (hValue: typeof h) => string }) {
  const html = htm.bind(h);

  return function htmlispToBreezewind(
    htmlInput?: string,
  ): string {
    if (!htmlInput) {
      throw new Error("convert - Missing html input");
    }

    if (htmlInput.startsWith("<!") || htmlInput.startsWith("<?")) {
      // @ts-ignore Ignore for now
      const [type, attributes, ...children] = html([htmlInput]) as [
        string,
        Record<string, unknown>,
      ];
      const endsWithQuestion = attributes["?"];

      // @ts-ignore Ignore for now
      return [{
        type,
        attributes: omit(attributes, "?"),
        closingCharacter: endsWithQuestion ? "?" : "",
      }].concat(children);
    }

    // @ts-ignore Ignore for now
    return html([htmlInput]);
  };
}

function h(
  type: string,
  attributes: Record<string, unknown> | null,
  ...children: string[]
) {
  return `<${type}>${children}</${type}>`;
}

export { getConverter };
