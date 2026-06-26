import {
  get,
  isObject,
  isString,
  isUndefined,
} from "../../utilities/functional.ts";
import type { Context } from "../types.ts";
import type { HtmlispRenderOptions } from "../types.ts";
import { isRawHtml } from "./rawHtml.ts";

function escapeHTML(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function resolveScopedValue(
  scope: { context?: Context; props?: Context; local?: Context },
  key: string,
  defaultValue?: unknown,
) {
  const sources = [scope.local, scope.props, scope.context];
  const resolved = sources
    .map((source) => resolveSourceValue(source, key))
    .find(hasResolvedValue);

  return hasResolvedValue(resolved) ? resolved : defaultValue;
}

function resolveSourceValue(source: Context | undefined, key: string) {
  return source && isObject(source) ? get(source, key) : undefined;
}

function hasResolvedValue(value: unknown) {
  return !isUndefined(value) && value !== null;
}

function renderTextValue(value: unknown, renderOptions?: HtmlispRenderOptions) {
  if (isEmptyRenderedValue(value)) {
    return "";
  }

  return renderEscapedValue(value, renderOptions);
}

function renderAttributeValue(
  value: unknown,
  renderOptions?: HtmlispRenderOptions,
) {
  if (isEmptyRenderedValue(value)) {
    return;
  }

  if (value === true) {
    return true;
  }

  return renderEscapedValue(value, renderOptions);
}

function isEmptyRenderedValue(value: unknown) {
  return value === false || value === null || isUndefined(value);
}

function renderEscapedValue(
  value: unknown,
  renderOptions?: HtmlispRenderOptions,
) {
  if (isRawHtml(value)) {
    return value.value;
  }

  const rendered = String(value);

  return renderOptions?.escapeByDefault ? escapeHTML(rendered) : rendered;
}

export {
  renderAttributeValue,
  renderTextValue,
  resolveScopedValue,
};
