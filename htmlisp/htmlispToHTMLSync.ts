import { isString } from "../utilities/functional.ts";
import { defaultUtilities } from "./defaultUtilities.ts";
import { parseTag } from "./utilities/parsers/htmlisp/parseTag.ts";
import { astToHtmlSync } from "./utilities/astToHtmlSync.ts";
import type { HtmllispToHTMLParameters } from "./types.ts";

function htmlispToHTMLSync(
  { htmlInput, components, context, props, utilities, componentUtilities }:
    HtmllispToHTMLParameters,
): string {
  if (!htmlInput) {
    throw new Error("convert - Missing html input");
  }

  if (!isString(htmlInput)) {
    throw new Error("convert - html input was not a string");
  }

  utilities?._onRenderStart && utilities?._onRenderStart(context || {});

  // astToHtml is async because utilities can be async.
  // If that dependency was lifted, then the whole implementation could
  // become sync.
  const ret = astToHtmlSync(
    parseTag(htmlInput),
    htmlispToHTMLSync,
    context,
    props,
    {},
    {
      render: (htmlInput: string) =>
        htmlInput
          ? htmlispToHTMLSync({
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

  utilities?._onRenderEnd && utilities?._onRenderEnd(context || {});

  return ret;
}

export { htmlispToHTMLSync };
