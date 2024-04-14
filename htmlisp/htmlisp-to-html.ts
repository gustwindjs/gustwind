import { isString } from "../utilities/functional.ts";
import { defaultUtilities } from "./defaultUtilities.ts";
import { parseTag } from "./utilities/parsers/parseTag.ts";
import { astToHtml } from "./utilities/astToHtml.ts";
import type { HtmllispToHTMLParameters } from "./types.ts";

async function htmlispToHTML(
  { htmlInput, components, context, props, utilities, componentUtilities }:
    HtmllispToHTMLParameters,
): Promise<string> {
  if (!htmlInput) {
    throw new Error("convert - Missing html input");
  }

  if (!isString(htmlInput)) {
    throw new Error("convert - html input was not a string");
  }

  utilities?._onRenderStart && utilities?._onRenderStart(context || {});

  const ret = astToHtml(
    await parseTag(htmlInput),
    htmlispToHTML,
    context,
    props,
    {},
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

  utilities?._onRenderEnd && utilities?._onRenderEnd(context || {});

  return ret;
}

export { htmlispToHTML };
