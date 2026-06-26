import { isString } from "../utilities/functional.ts";
import { defaultUtilities } from "./defaultUtilities.ts";
import type { Context, HtmlispToHTMLParameters, Utilities } from "./types.ts";
import { raw } from "./utilities/runtime.ts";

function getHtmlInput({ htmlInput }: HtmlispToHTMLParameters) {
  if (!htmlInput) {
    throw new Error("convert - Missing html input");
  }

  if (!isString(htmlInput)) {
    throw new Error("convert - html input was not a string");
  }

  return htmlInput;
}

function startRender(utilities: Utilities | undefined, context?: Context) {
  utilities?._onRenderStart && utilities?._onRenderStart(context || {});
}

function endRender(utilities: Utilities | undefined, context?: Context) {
  utilities?._onRenderEnd && utilities?._onRenderEnd(context || {});
}

function createRenderUtilities(
  utilities: Utilities | undefined,
  render: (htmlInput: unknown) => unknown,
) {
  return {
    render,
    renderRaw: raw,
    ...defaultUtilities,
    ...utilities,
  };
}

export { createRenderUtilities, endRender, getHtmlInput, startRender };
