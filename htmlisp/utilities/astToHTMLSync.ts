import { parseExpressionsSync } from "./parseExpressionsSync.ts";
import { renderElement } from "./renderElement.ts";
import type {
  Components,
  Context,
  Element,
  HtmlispRenderOptions,
  HtmlispToHTMLParameters,
} from "../types.ts";
import type { Utilities } from "../../types.ts";
import { renderTextValue } from "./runtime.ts";
import {
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
  type RenderContext,
  slotsToObject,
} from "./astToHTMLShared.ts";

// Currently this contains htmlisp syntax specific logic but technically
// that could be decoupled as well.
// TODO: Derive this type from HtmlispToHTMLParameters
function astToHTMLSync(
  ast: (string | Element)[],
  htmlispToHTML: (args: HtmlispToHTMLParameters) => unknown,
  context?: Context,
  props?: Context,
  initialLocal?: Context,
  utilities?: Utilities,
  componentUtilities?: Record<string, Utilities>,
  components?: Components,
  renderOptions?: HtmlispRenderOptions,
  // Helper for debugging
  parentAst?: (string | Element)[],
): string {
  const renderContext = createRenderContext(
    ast,
    htmlispToHTML,
    context,
    props,
    utilities,
    componentUtilities,
    components,
    renderOptions,
    parentAst,
  );

  return ast.map((tag) => renderTagSync(tag, renderContext, initialLocal)).join(
    "",
  );
}

function renderTagSync(
  tag: string | Element,
  renderContext: RenderContext,
  initialLocal?: Context,
) {
  if (typeof tag === "string") {
    return renderTextValue(tag, renderContext.renderOptions);
  }

  const renderState = createTagRenderStateSync(
    tag,
    renderContext,
    initialLocal,
  );

  return renderElementTagSync(renderState);
}

type TagRenderState = {
  tag: Element;
  renderContext: RenderContext;
  local: Context | undefined;
  parsedAttributes: Context;
  isComponent: Components | boolean | undefined;
};

function createTagRenderStateSync(
  tag: Element,
  renderContext: RenderContext,
  initialLocal?: Context,
): TagRenderState {
  const isComponent = isComponentTag(tag.type, renderContext.components);
  let local = initialLocal;
  const parsedAttributes = parseExpressionsSync(
    tag.attributes,
    {
      context: renderContext.context || {},
      props: renderContext.props || {},
      local,
    },
    getExpressionUtilities(tag.type, isComponent, renderContext),
  );

  if (tag.type === "noop") {
    local = parsedAttributes;
  }

  return {
    tag,
    renderContext,
    local,
    parsedAttributes,
    isComponent,
  };
}

function renderElementTagSync(renderState: TagRenderState) {
  const { tag, parsedAttributes, local, renderContext, isComponent } =
    renderState;

  if (isHidden(parsedAttributes)) {
    return "";
  }

  if (parsedAttributes.foreach) {
    return renderForeachElementSync(renderState);
  }

  const renderedChildren = renderChildrenSync(tag, local, renderContext);

  if (isComponent) {
    return renderComponentSync(
      tag,
      parsedAttributes,
      renderedChildren,
      local,
      renderContext,
    );
  }

  return renderElement(
    parsedAttributes,
    tag,
    renderedChildren,
    renderContext.renderOptions,
  );
}

function renderForeachElementSync(
  { tag, parsedAttributes, local, renderContext }: TagRenderState,
) {
  return renderElement(
    parsedAttributes,
    tag,
    renderForeachChildrenSync(tag, parsedAttributes, local, renderContext),
    renderContext.renderOptions,
  );
}

function renderForeachChildrenSync(
  tag: Element,
  parsedAttributes: Context,
  local: Context | undefined,
  renderContext: RenderContext,
) {
  const { items, alias } = getForeachItems(parsedAttributes);

  return items.map((p) =>
    astToHTMLSync(
      tag.children,
      renderContext.htmlispToHTML,
      renderContext.context,
      createForeachProps(renderContext.props, p, alias),
      local,
      renderContext.utilities,
      renderContext.componentUtilities,
      renderContext.components,
      renderContext.renderOptions,
      renderContext.ast,
    )
  ).join("");
}

function renderChildrenSync(
  tag: Element,
  local: Context | undefined,
  renderContext: RenderContext,
) {
  return astToHTMLSync(
    tag.children,
    renderContext.htmlispToHTML,
    renderContext.context,
    renderContext.props,
    local,
    renderContext.utilities,
    renderContext.componentUtilities,
    renderContext.components,
    renderContext.renderOptions,
    renderContext.ast,
  );
}

function renderComponentSync(
  tag: Element,
  parsedAttributes: Context,
  renderedChildren: string,
  local: Context | undefined,
  renderContext: RenderContext,
) {
  const foundComponent = getComponentOrThrow(tag, renderContext);

  const componentSlots = slotsToPropsSync(
    renderContext.ast,
    tag,
    renderContext.htmlispToHTML,
    renderContext.context,
    renderContext.props,
    local,
    renderContext.utilities,
    renderContext.componentUtilities,
    renderContext.components,
    renderContext.renderOptions,
    typeof foundComponent !== "function",
  );
  const componentProps = createComponentProps(
    tag,
    parsedAttributes,
    componentSlots,
    renderedChildren,
    typeof foundComponent === "function",
    renderContext,
  );
  const renderedComponent = typeof foundComponent === "function"
    ? foundComponent(componentProps)
    : foundComponent;

  if (renderedComponent instanceof Promise) {
    throw new Error(
      `Component "${tag.type}" returned a Promise in sync rendering`,
    );
  }

  return renderContext.htmlispToHTML(createRenderComponentParameters(
    tag,
    renderedComponent,
    componentProps,
    renderContext,
  ));
}

function slotsToPropsSync(
  ast: (string | Element)[],
  tag: Element,
  htmlispToHTML: (args: HtmlispToHTMLParameters) => unknown,
  context?: Context,
  props?: Context,
  local?: Context,
  utilities?: Utilities,
  componentUtilities?: Record<string, Utilities>,
  components?: Components,
  renderOptions?: HtmlispRenderOptions,
  wrapRenderedOutput?: boolean,
) {
  // @ts-expect-error Filter breaks the type here
  const slots: [string | null, string | null][] = getSlotElements(tag)
    .map(
      (o) =>
        typeof o !== "string" &&
        [
          o.attributes?.name,
          astToHTMLSync(
            o.children,
            htmlispToHTML,
            context,
            props,
            local,
            utilities,
            componentUtilities,
            components,
            renderOptions,
            // Pass original ast to help with debugging
            ast,
          ),
        ],
    ).filter(Boolean);

  assertNamedSlots(slots);

  return slotsToObject(slots, wrapRenderedOutput);
}

export { astToHTMLSync };
