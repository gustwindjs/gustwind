import { isString } from "../utilities/functional.ts";
import { defaultUtilities } from "../breezewind/defaultUtilities.ts";
import { parseHtmlisp } from "./utilities/parseHtmlisp.ts";
import { astToHtml } from "./utilities/astToHtml.ts";
import type { HtmllispToHTMLParameters } from "./types.ts";

function htmlispToHTML(
  { htmlInput, components, context, props, utilities, componentUtilities }:
    HtmllispToHTMLParameters,
): Promise<string> | string {
  if (!htmlInput) {
    throw new Error("convert - Missing html input");
  }

  if (!isString(htmlInput)) {
    throw new Error("convert - html input was not a string");
  }

  return astToHtml(
    parseHtmlisp(htmlInput),
    htmlispToHTML,
    context,
    props,
    {
      render: (htmlInput: string) =>
        htmlInput
          ? htmlispToHTML({
            htmlInput,
            components,
            context,
            props,
            utilities,
            componentUtilities,
          })
          : "",
      ...defaultUtilities,
      ...utilities,
    },
    componentUtilities,
    components || {},
    [],
  );
}

export { htmlispToHTML };
