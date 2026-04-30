import { isString } from "../utilities/functional.ts";
import { defaultUtilities } from "./defaultUtilities.ts";
import { parseTag } from "./parsers/htmlisp/parseTag.ts";
import { astToHTMLSync } from "./utilities/astToHTMLSync.ts";
import type { HtmlispToHTMLParameters } from "./types.ts";
import { isRawHtml, raw } from "./utilities/runtime.ts";

function htmlispToHTMLSync(
  {
    htmlInput,
    components,
    context,
    props,
    utilities,
    componentUtilities,
    renderOptions,
  }: HtmlispToHTMLParameters,
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
  const ret = astToHTMLSync(
    parseTag(htmlInput),
    htmlispToHTMLSync,
    context,
    props,
    {},
    {
      render: (htmlInput: unknown) => {
        const renderedInput = isRawHtml(htmlInput)
          ? htmlInput.value
          : htmlInput;

        return renderedInput
          ? raw(htmlispToHTMLSync({
            htmlInput: String(renderedInput),
            components,
            context,
            props,
            utilities,
            componentUtilities,
            renderOptions,
          }))
          : raw("");
      },
      ...defaultUtilities,
      ...utilities,
    },
    componentUtilities,
    components || {},
    renderOptions,
    [],
  );

  utilities?._onRenderEnd && utilities?._onRenderEnd(context || {});

  return ret;
}

export { htmlispToHTMLSync };
