import type { Components, Context, Element } from "../types.ts";
import type { Utilities } from "../../types.ts";
import { raw } from "./runtime.ts";

type RenderContextBase = {
  props?: Context;
  utilities?: Utilities;
  componentUtilities?: Record<string, Utilities>;
  components?: Components;
};

function createComponentProps(
  tag: Element,
  parsedAttributes: Context,
  componentSlots: Context,
  renderedChildren: string,
  rendersFromFunction: boolean,
  renderContext: RenderContextBase,
) {
  return {
    children: rendersFromFunction ? renderedChildren : raw(renderedChildren),
    ...tag.attributes,
    ...parsedAttributes,
    ...componentSlots,
    props: renderContext.props,
    utilities: renderContext.utilities,
    componentUtilities: renderContext.componentUtilities,
    components: renderContext.components,
  };
}

function createForeachProps(
  props: Context | undefined,
  item: unknown,
  alias?: string,
) {
  const loopProps: Context = {
    ...(props || {}),
    value: item,
  };

  if (item && typeof item === "object" && !Array.isArray(item)) {
    Object.assign(loopProps, item);
  }

  if (alias) {
    loopProps[alias] = item;
  }

  return loopProps;
}

function getExpressionUtilities(
  type: string,
  isComponent: Components | boolean | undefined,
  renderContext: RenderContextBase,
) {
  if (isComponent) {
    return {
      ...renderContext.utilities,
      ...renderContext.componentUtilities?.[type],
    };
  }

  return renderContext.utilities ? renderContext.utilities : {};
}

function isComponentTag(type: string, components?: Components) {
  const typeFirstLetter = type[0];

  return !["!", "?"].some((s) => s === typeFirstLetter) &&
    components &&
    type[0]?.toUpperCase() === typeFirstLetter &&
    !type.split("").every((t) => t.toUpperCase() === t);
}

function isHidden(parsedAttributes: Context) {
  return Object.hasOwn(parsedAttributes, "visibleIf") &&
    (
      parsedAttributes.visibleIf === false ||
      parsedAttributes.visibleIf === undefined ||
      (parsedAttributes.visibleIf as { length?: number })?.length === 0
    );
}

export {
  createComponentProps,
  createForeachProps,
  getExpressionUtilities,
  isComponentTag,
  isHidden,
};
