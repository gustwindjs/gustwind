import type {
  Components,
  Context,
  Element,
  HtmlispRenderOptions,
  HtmlispToHTMLParameters,
} from "../types.ts";
import type { Utilities } from "../../types.ts";
import { raw } from "./runtime.ts";
import { isForeachBinding } from "./parseForeachExpression.ts";

type RenderContextBase = {
  props?: Context;
  utilities?: Utilities;
  componentUtilities?: Record<string, Utilities>;
  components?: Components;
};
type RenderContext = RenderContextBase & {
  ast: (string | Element)[];
  htmlispToHTML: (args: HtmlispToHTMLParameters) => unknown;
  context?: Context;
  renderOptions?: HtmlispRenderOptions;
  parentAst?: (string | Element)[];
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

function createRenderContext(
  ast: (string | Element)[],
  htmlispToHTML: (args: HtmlispToHTMLParameters) => unknown,
  context?: Context,
  props?: Context,
  utilities?: Utilities,
  componentUtilities?: Record<string, Utilities>,
  components?: Components,
  renderOptions?: HtmlispRenderOptions,
  parentAst?: (string | Element)[],
): RenderContext {
  return {
    ast,
    htmlispToHTML,
    context,
    props,
    utilities,
    componentUtilities,
    components,
    renderOptions,
    parentAst,
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

  assignObjectItemProps(loopProps, item);
  assignAliasProp(loopProps, item, alias);

  return loopProps;
}

function assignObjectItemProps(loopProps: Context, item: unknown) {
  if (isPlainObjectItem(item)) {
    Object.assign(loopProps, item);
  }
}

function isPlainObjectItem(item: unknown) {
  return item && typeof item === "object" && !Array.isArray(item);
}

function assignAliasProp(loopProps: Context, item: unknown, alias?: string) {
  if (alias) {
    loopProps[alias] = item;
  }
}

function getForeachItems(parsedAttributes: Context) {
  const foreachBinding = isForeachBinding(parsedAttributes.foreach)
    ? parsedAttributes.foreach
    : { items: parsedAttributes.foreach as unknown[] };
  const { items, alias } = foreachBinding;

  delete parsedAttributes.foreach;

  // TODO: Test this case
  if (!Array.isArray(items)) {
    console.error(items);
    throw new Error("foreach - Tried to iterate a non-array!");
  }

  return { alias, items };
}

function getComponentOrThrow(tag: Element, renderContext: RenderContext) {
  const foundComponent = renderContext.components?.[tag.type];

  if (!foundComponent) {
    console.error({
      parentAst: renderContext.parentAst,
      ast: renderContext.ast,
    });
    throw new Error(`Component "${tag.type}" was not found!`);
  }

  return foundComponent;
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

  return (
    !["!", "?"].some((s) => s === typeFirstLetter) &&
    components &&
    type[0]?.toUpperCase() === typeFirstLetter &&
    !type.split("").every((t) => t.toUpperCase() === t)
  );
}

function isHidden(parsedAttributes: Context) {
  return (
    Object.hasOwn(parsedAttributes, "visibleIf") &&
    (parsedAttributes.visibleIf === false ||
      parsedAttributes.visibleIf === undefined ||
      (parsedAttributes.visibleIf as { length?: number })?.length === 0)
  );
}

function createRenderComponentParameters(
  tag: Element,
  renderedComponent: unknown,
  componentProps: Context,
  renderContext: RenderContext,
): HtmlispToHTMLParameters {
  return {
    htmlInput: renderedComponent as HtmlispToHTMLParameters["htmlInput"],
    components: renderContext.components,
    context: renderContext.context,
    props: componentProps,
    utilities: {
      ...renderContext.utilities,
      ...renderContext.componentUtilities?.[tag.type],
    },
    componentUtilities: renderContext.componentUtilities,
    renderOptions: renderContext.renderOptions,
  };
}

function getSlotElements(tag: Element) {
  return tag.children.filter((o) => typeof o !== "string" && o.type === "slot");
}

function assertNamedSlots(slots: [string | null, string | null][]) {
  if (!slots.every((s) => s[0])) {
    throw new Error(`Slot is missing a name!`);
  }
}

function slotsToObject(
  slots: [string | null, string | null][],
  wrapRenderedOutput?: boolean,
) {
  return Object.fromEntries(
    slots.map(([name, value]) => [
      name,
      wrapRenderedOutput ? raw(value) : value,
    ]),
  );
}

export {
  assertNamedSlots,
  createComponentProps,
  createForeachProps,
  createRenderComponentParameters,
  createRenderContext,
  getComponentOrThrow,
  getExpressionUtilities,
  getForeachItems,
  getSlotElements,
  isComponentTag,
  isHidden,
  slotsToObject,
};
export type { RenderContext };
