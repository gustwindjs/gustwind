import { parseTag } from "./parsers/htmlisp/parseTag.ts";
import { astToHTML } from "./utilities/astToHTML.ts";
import type { HtmlispToHTMLParameters } from "./types.ts";
import { isRawHtml, raw } from "./utilities/rawHtml.ts";
import {
  createRenderUtilities,
  endRender,
  getHtmlInput,
  startRender,
} from "./htmlispToHTMLShared.ts";

async function htmlispToHTML(
  options: HtmlispToHTMLParameters,
): Promise<string> {
  const htmlInput = getHtmlInput(options);
  startRender(options.utilities, options.context);

  // astToHtml is async because utilities can be async.
  // If that dependency was lifted, then the whole implementation could
  // become sync.
  const ret = await renderParsedHtml(htmlInput, options);

  endRender(options.utilities, options.context);

  return ret;
}

function renderParsedHtml(
  htmlInput: string,
  options: HtmlispToHTMLParameters,
) {
  const { components, context, props, componentUtilities, renderOptions } =
    options;

  return astToHTML(
    parseTag(htmlInput),
    htmlispToHTML,
    context,
    props,
    {},
    createRenderUtilities(options.utilities, createRenderUtility(options)),
    componentUtilities,
    components || {},
    renderOptions,
    [],
  );
}

function createRenderUtility(options: HtmlispToHTMLParameters) {
  return (htmlInput: unknown) => {
    if (isRawHtml(htmlInput)) {
      return raw(htmlInput.value);
    }

    return htmlInput
      ? htmlispToHTML({
        ...options,
        htmlInput: String(htmlInput),
      }).then(raw)
      : raw("");
  };
}

export { htmlispToHTML };
