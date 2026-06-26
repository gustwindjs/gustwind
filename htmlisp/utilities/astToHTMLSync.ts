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
import { raw, renderTextValue } from "./runtime.ts";
import { isForeachBinding } from "./parseForeachExpression.ts";
import {
  createComponentProps,
  createForeachProps,
  getExpressionUtilities,
  isComponentTag,
  isHidden,
} from "./astToHTMLShared.ts";

type RenderContext = {
  ast: (string | Element)[];
  htmlispToHTML: (args: HtmlispToHTMLParameters) => unknown;
  context?: Context;
  props?: Context;
  utilities?: Utilities;
  componentUtilities?: Record<string, Utilities>;
  components?: Components;
  renderOptions?: HtmlispRenderOptions;
  parentAst?: (string | Element)[];
};

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
  const renderContext = {
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

  if (isHidden(parsedAttributes)) {
    return "";
  }

  if (parsedAttributes.foreach) {
    return renderElement(
      parsedAttributes,
      tag,
      renderForeachChildrenSync(tag, parsedAttributes, local, renderContext),
      renderContext.renderOptions,
    );
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

function renderForeachChildrenSync(
  tag: Element,
  parsedAttributes: Context,
  local: Context | undefined,
  renderContext: RenderContext,
) {
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
  const foundComponent = renderContext.components?.[tag.type];

  if (!foundComponent) {
    console.error({
      parentAst: renderContext.parentAst,
      ast: renderContext.ast,
    });
    throw new Error(`Component "${tag.type}" was not found!`);
  }

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

  return renderContext.htmlispToHTML({
    htmlInput: renderedComponent,
    components: renderContext.components,
    context: renderContext.context,
    props: componentProps,
    utilities: {
      ...renderContext.utilities,
      ...renderContext.componentUtilities?.[tag.type],
    },
    componentUtilities: renderContext.componentUtilities,
    renderOptions: renderContext.renderOptions,
  });
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
  const { children } = tag;

  // @ts-expect-error Filter breaks the type here
  const slots: [string | null, string | null][] = children.filter((o) =>
    typeof o !== "string" && o.type === "slot"
  )
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

  if (!slots.every((s) => s[0])) {
    throw new Error(`Slot is missing a name!`);
  }

  return Object.fromEntries(
    slots.map((
      [name, value],
    ) => [name, wrapRenderedOutput ? raw(value) : value]),
  );
}

export { astToHTMLSync };
