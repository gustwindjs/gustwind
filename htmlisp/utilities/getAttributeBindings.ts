import { omit } from "../../utilities/functional.ts";
import { parseExpressions } from "./parseExpressions.ts";
import type { HtmlispRenderOptions } from "../types.ts";
import { renderAttributeValue } from "./runtime.ts";

function getAttributeBindings(
  parsedExpressions: Awaited<ReturnType<typeof parseExpressions>>,
  renderOptions?: HtmlispRenderOptions,
) {
  const explicitAttributes = getExplicitAttributes(parsedExpressions);
  const serializedAttributes = serializeExtraAttributes(
    parsedExpressions.attrs,
    explicitAttributes,
    renderOptions,
  );

  for (const [key, value] of Object.entries(explicitAttributes)) {
    addSerializedAttribute(serializedAttributes, key, value, renderOptions);
  }

  const ret = stringifySerializedAttributes(serializedAttributes);

  if (ret.length) {
    return " " + ret;
  }

  return "";
}

export { getAttributeBindings };

function getExplicitAttributes(
  parsedExpressions: Awaited<ReturnType<typeof parseExpressions>>,
) {
  return omit(
    omit(omit(parsedExpressions, "children"), "visibleIf"),
    "attrs",
  );
}

function serializeExtraAttributes(
  extraAttributes: unknown,
  explicitAttributes: Record<string, unknown>,
  renderOptions?: HtmlispRenderOptions,
) {
  const serializedAttributes: [string, string | boolean][] = [];

  if (!isExtraAttributesObject(extraAttributes)) {
    return serializedAttributes;
  }

  for (const [key, value] of Object.entries(extraAttributes)) {
    addExtraSerializedAttribute(
      serializedAttributes,
      explicitAttributes,
      key,
      value,
      renderOptions,
    );
  }

  return serializedAttributes;
}

function isExtraAttributesObject(
  extraAttributes: unknown,
): extraAttributes is Record<string, unknown> {
  return Boolean(extraAttributes && typeof extraAttributes === "object");
}

function addExtraSerializedAttribute(
  serializedAttributes: [string, string | boolean][],
  explicitAttributes: Record<string, unknown>,
  key: string,
  value: unknown,
  renderOptions?: HtmlispRenderOptions,
) {
  if (!Object.hasOwn(explicitAttributes, key)) {
    addSerializedAttribute(serializedAttributes, key, value, renderOptions);
  }
}

function addSerializedAttribute(
  serializedAttributes: [string, string | boolean][],
  key: string,
  value: unknown,
  renderOptions?: HtmlispRenderOptions,
) {
  const rendered = renderAttributeValue(value, renderOptions);

  if (typeof rendered !== "undefined") {
    serializedAttributes.push([key, rendered]);
  }
}

function stringifySerializedAttributes(
  serializedAttributes: [string, string | boolean][],
) {
  return serializedAttributes.map(([key, value]) =>
    typeof value === "string" ? `${key}="${value}"` : key
  ).join(" ");
}
