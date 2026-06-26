import { parseTag } from "./parsers/htmlisp/parseTag.ts";
import { astToHTMLSync } from "./utilities/astToHTMLSync.ts";
import type { HtmlispToHTMLParameters } from "./types.ts";
import { isRawHtml, raw } from "./utilities/runtime.ts";
import {
  createRenderUtilities,
  endRender,
  getHtmlInput,
  startRender,
} from "./htmlispToHTMLShared.ts";

function htmlispToHTMLSync(options: HtmlispToHTMLParameters): string {
  const htmlInput = getHtmlInput(options);
  startRender(options.utilities, options.context);

  // astToHtml is async because utilities can be async.
  // If that dependency was lifted, then the whole implementation could
  // become sync.
  const ret = renderParsedHtmlSync(htmlInput, options);

  endRender(options.utilities, options.context);

  return ret;
}

function renderParsedHtmlSync(
  htmlInput: string,
  options: HtmlispToHTMLParameters,
) {
  const { components, context, props, componentUtilities, renderOptions } =
    options;

  return astToHTMLSync(
    parseTag(htmlInput),
    htmlispToHTMLSync,
    context,
    props,
    {},
    createRenderUtilities(options.utilities, createRenderUtilitySync(options)),
    componentUtilities,
    components || {},
    renderOptions,
    [],
  );
}

function createRenderUtilitySync(options: HtmlispToHTMLParameters) {
  return (htmlInput: unknown) => {
    if (isRawHtml(htmlInput)) {
      return raw(htmlInput.value);
    }

    return htmlInput
      ? raw(htmlispToHTMLSync({
        ...options,
        htmlInput: String(htmlInput),
      }))
      : raw("");
  };
}

export { htmlispToHTMLSync };
