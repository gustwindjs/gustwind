import {
  get,
  isObject,
  isString,
  isUndefined,
} from "../../utilities/functional.ts";
import type { Context } from "../types.ts";
import type { HtmlispRenderOptions, RawHtml } from "../types.ts";

function raw(value: unknown): RawHtml {
  if (isRawHtml(value)) {
    return value;
  }

  return {
    __htmlispRaw: true,
    value: value === null || isUndefined(value) ? "" : String(value),
  };
}

function isRawHtml(value: unknown): value is RawHtml {
  if (!isObject(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return candidate.__htmlispRaw === true &&
    typeof candidate.value === "string";
}

function unwrapRawHtml(value: unknown) {
  if (isRawHtml(value)) {
    return value.value;
  }

  return value === null || isUndefined(value) ? "" : String(value);
}

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

  for (const source of sources) {
    if (!source || !isObject(source)) {
      continue;
    }

    const resolved = get(source, key);

    if (!isUndefined(resolved) && resolved !== null) {
      return resolved;
    }
  }

  return defaultValue;
}

function renderTextValue(
  value: unknown,
  renderOptions?: HtmlispRenderOptions,
) {
  if (value === false || value === null || isUndefined(value)) {
    return "";
  }

  if (isRawHtml(value)) {
    return value.value;
  }

  const rendered = String(value);

  return renderOptions?.escapeByDefault ? escapeHTML(rendered) : rendered;
}

function renderAttributeValue(
  value: unknown,
  renderOptions?: HtmlispRenderOptions,
) {
  if (value === false || value === null || isUndefined(value)) {
    return;
  }

  if (value === true) {
    return true;
  }

  const rendered = isRawHtml(value) ? value.value : String(value);

  return renderOptions?.escapeByDefault ? escapeHTML(rendered) : rendered;
}

export {
  escapeHTML,
  isRawHtml,
  raw,
  renderAttributeValue,
  renderTextValue,
  resolveScopedValue,
  unwrapRawHtml,
};
