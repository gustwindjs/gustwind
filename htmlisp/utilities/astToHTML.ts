import { parseExpressions } from "./parseExpressions.ts";
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
async function astToHTML(
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
): Promise<string> {
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

  return (await Promise.all(
    ast.map((tag) => renderTag(tag, renderContext, initialLocal)),
  )).join("");
}

async function renderTag(
  tag: string | Element,
  renderContext: RenderContext,
  initialLocal?: Context,
) {
  if (typeof tag === "string") {
    return renderTextValue(tag, renderContext.renderOptions);
  }

  const isComponent = isComponentTag(tag.type, renderContext.components);
  let local = initialLocal;
  const parsedAttributes = await parseExpressions(
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
      await renderForeachChildren(tag, parsedAttributes, local, renderContext),
      renderContext.renderOptions,
    );
  }

  const renderedChildren = renderChildren(tag, local, renderContext);

  if (isComponent) {
    return renderComponent(
      tag,
      parsedAttributes,
      await renderedChildren,
      local,
      renderContext,
    );
  }

  return renderElement(
    parsedAttributes,
    tag,
    await renderedChildren,
    renderContext.renderOptions,
  );
}

async function renderForeachChildren(
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

  return (await Promise.all(
    items.map((p) =>
      astToHTML(
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
    ),
  )).join("");
}

function renderChildren(
  tag: Element,
  local: Context | undefined,
  renderContext: RenderContext,
) {
  return astToHTML(
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

async function renderComponent(
  tag: Element,
  parsedAttributes: Context,
  componentChildren: string,
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

  const componentSlots = await slotsToProps(
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
    componentChildren,
    typeof foundComponent === "function",
    renderContext,
  );
  const renderedComponent = typeof foundComponent === "function"
    ? await foundComponent(componentProps)
    : foundComponent;

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

async function slotsToProps(
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
  const slots: [string | null, string | null][] = await Promise.all(
    children.filter((o) => typeof o !== "string" && o.type === "slot")
      .map(
        async (o) =>
          typeof o !== "string" &&
          [
            o.attributes?.name,
            await astToHTML(
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
      ).filter(Boolean),
  );

  if (!slots.every((s) => s[0])) {
    throw new Error(`Slot is missing a name!`);
  }

  return Object.fromEntries(
    slots.map((
      [name, value],
    ) => [name, wrapRenderedOutput ? raw(value) : value]),
  );
}

export { astToHTML };
