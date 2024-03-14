import { isString } from "../utilities/functional.ts";
import { defaultUtilities } from "../breezewind/defaultUtilities.ts";
import { parseHtmlisp } from "./utilities/parseHtmlisp.ts";
import { astToHtml } from "./utilities/astToHtml.ts";
import type { Utilities } from "../breezewind/types.ts";
import type { Components, Context, HtmllispToHTMLParameters } from "./types.ts";

function getConverter() {
  return function htmlispToHTML(
    { htmlInput, components, context, props, utilities }:
      HtmllispToHTMLParameters,
  ): Promise<string> | string {
    if (!htmlInput) {
      throw new Error("convert - Missing html input");
    }

    if (!isString(htmlInput)) {
      throw new Error("convert - html input was not a string");
    }

    if (htmlInput.startsWith("<!") || htmlInput.startsWith("<?")) {
      return htmlInput;
    }

    return getConvertToHTML(
      components || {},
      context || {},
      props || {},
      {
        ...defaultUtilities,
        ...utilities,
      },
      htmlispToHTML,
    )(htmlInput);
  };
}

function getConvertToHTML(
  components: Components,
  context: Context,
  props: Context,
  utilities: Utilities,
  htmlispToHTML: (args: HtmllispToHTMLParameters) => unknown,
) {
  return function convert(input: string) {
    return astToHtml(
      parseHtmlisp(input),
      htmlispToHTML,
      context,
      props,
      utilities,
      components,
    );
  };
}

export { getConverter };
