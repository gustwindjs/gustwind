import { isString } from "../utilities/functional.ts";
import { defaultUtilities } from "./defaultUtilities.ts";
import { characterGenerator } from "./utilities/parsers/characterGenerator.ts";
import { parseTag } from "./utilities/parsers/parseTag.ts";
import { astToHtml } from "./utilities/astToHtml.ts";
import type { HtmllispToHTMLParameters } from "./types.ts";

// TODO: Potentially the cache could exist on fs even (needs to be benchmarked)
const CACHE = new Map();

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

  utilities?._onRenderStart && utilities?._onRenderStart(context || {});

  let cachedAst = CACHE.get(htmlInput);

  if (!cachedAst) {
    cachedAst = parseTag(characterGenerator(htmlInput));

    CACHE.set(htmlInput, cachedAst);
  }

  const ret = astToHtml(
    cachedAst,
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

  utilities?._onRenderEnd && utilities?._onRenderEnd(context || {});

  return ret;
}

export { htmlispToHTML };
