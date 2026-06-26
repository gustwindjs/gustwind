import { isObject, isUndefined } from "../../utilities/functional.ts";
import type { RawHtml } from "../types.ts";

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

  return candidate.__htmlispRaw === true && typeof candidate.value === "string";
}

function unwrapRawHtml(value: unknown) {
  if (isRawHtml(value)) {
    return value.value;
  }

  return value === null || isUndefined(value) ? "" : String(value);
}

export { isRawHtml, raw, unwrapRawHtml };
