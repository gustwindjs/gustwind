import { get, isUndefined } from "../utils/functional.ts";
import { evaluateExpression } from "../utils/evaluate.ts";
import type { Component, Context, Extension, Utilities } from "./types.ts";

async function render(
  { component, components, extensions, context, props, utilities }: {
    component: Component | Component[];
    components?: Record<string, Component | Component[]>;
    extensions?: (Extension)[];
    context?: Context;
    props?: Context;
    utilities?: Utilities;
  },
): Promise<string> {
  if (Array.isArray(component)) {
    return (await Promise.all(
      component.map((c) =>
        render({
          component: c,
          components,
          extensions,
          context,
          props,
          utilities,
        })
      ),
    )).join("");
  }

  let element = component.element;
  const foundComponent = element && components?.[element];

  if (foundComponent) {
    return (await Promise.all(
      (Array.isArray(foundComponent) ? foundComponent : [foundComponent]).map((
        c,
      ) =>
        render({
          component: c,
          components,
          extensions,
          context,
          // @ts-ignore: component is Component now for sure
          props: component.props || props,
          utilities,
        })
      ),
    )).join("");
  }

  const evalRender = (component: Component | Component[]) =>
    render({ component, components, extensions, context, utilities });

  if (extensions) {
    for (const extension of extensions) {
      component = await extension(component, {
        props: component.props || props,
        render: evalRender,
        context,
        utilities,
      });
    }

    element = component.element;
  }

  if (component.__element) {
    element = (get({ props: component.props }, component.__element) ||
      get({ context, props }, component.__element) || element) as string;
  }

  const attributes = await generateAttributes(
    component.attributes,
    typeof component.props !== "string"
      ? {
        props: component.props || props,
        render: evalRender,
        context,
        utilities,
      }
      : context,
  );

  if (component.children) {
    let children = component.children;

    if (Array.isArray(children)) {
      children = await render({
        component: children,
        props: component.props || props,
        components,
        extensions,
        context,
        utilities,
      });
    }

    return toHTML(element, attributes, children);
  }

  if (component.props) {
    const children = component.__children;

    if (children) {
      return toHTML(
        element,
        attributes,
        get({ context, props: component.props }, children),
      );
    }
  }

  if (
    (context || props) && component.__children &&
    typeof component.__children === "string"
  ) {
    // TODO: What if get fails?
    return toHTML(
      element,
      attributes,
      get({ context, props }, component.__children),
    );
  }

  const expression = component["==children"];

  if (expression) {
    return toHTML(
      element,
      attributes,
      await evaluateExpression(expression, {
        render: evalRender,
        props: component.props || props,
        context,
        utilities,
      }),
    );
  }

  if (element) {
    if (typeof component.closingCharacter === "string") {
      return `<${element}${
        attributes ? " " + attributes : ""
      } ${component.closingCharacter}>`;
    }

    return `<${element}${attributes ? " " + attributes : ""}></${element}>`;
  }

  return "";
}

function toHTML(
  element: Component["element"],
  attributes: string,
  value?: unknown,
) {
  if (element) {
    return `<${element}${
      attributes ? " " + attributes : ""
    }>${value}</${element}>`;
  }

  return (value as string) || "";
}

async function generateAttributes(
  attributes: Component["attributes"],
  context?: Context,
): Promise<string> {
  if (!attributes) {
    return "";
  }

  return (await Promise.all(
    Object.entries(attributes).map(async ([k, v]) => {
      if (isUndefined(v)) {
        return "";
      }

      let key = k;
      let value = v;

      if (k.startsWith("__")) {
        key = k.split("__").slice(1).join("__");

        // TODO: What if value isn't found?
        value = get(context, v) as string;
      }

      if (k.startsWith("==") && typeof v === "string") {
        key = k.split("==").slice(1).join("==");
        value = await evaluateExpression(v, context);
      }

      return value && value.length > 0 ? `${key}="${value}"` : key;
    }),
  )).join(" ");
}

export default render;
