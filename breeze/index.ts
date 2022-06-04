import { get, isUndefined } from "../utils/functional.ts";
import { evaluateExpression } from "../utils/evaluate.ts";
import type { Component, Context, Extension, Utilities } from "./types.ts";

async function render(
  { component, components, extensions, context, utilities }: {
    component: Component | Component[];
    components?: Record<string, Component | Component[]>;
    extensions?: (Extension)[];
    context?: Context;
    utilities?: Utilities;
  },
): Promise<string> {
  if (Array.isArray(component)) {
    return (await Promise.all(
      component.map((c) =>
        render({ component: c, components, extensions, context, utilities })
      ),
    )).join("");
  }

  const foundComponent = component.element && components?.[component.element];

  if (foundComponent) {
    return (await Promise.all(
      (Array.isArray(foundComponent) ? foundComponent : [foundComponent]).map((
        c,
      ) =>
        render({
          // @ts-ignore: component is Component now for sure
          component: { ...c, props: component.props },
          components,
          extensions,
          context,
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
        ...component.props,
        render: evalRender,
        context,
        utilities,
      });
    }
  }

  const attributes = await generateAttributes(
    component.attributes,
    typeof component.props !== "string"
      ? { ...component.props, render: evalRender, context, utilities }
      : context,
  );

  if (component.children) {
    let children = component.children;

    if (Array.isArray(children)) {
      children = await render({
        component: children.map((c) => ({
          ...c,
          // @ts-ignore: component is Component now for sure
          props: c.props || component.props,
        })),
        components,
        extensions,
        context,
        utilities,
      });
    }

    if (component.element) {
      return `<${component.element}${
        attributes ? " " + attributes : ""
      }>${children}</${component.element}>`;
    }

    return children;
  }

  if (component.props) {
    if (component.__children) {
      const value = get(component.props, component.__children) ||
        get({ context }, component.__children);

      return `<${component.element}${
        attributes ? " " + attributes : ""
      }>${value}</${component.element}>`;
    }

    const expression = component["==children"];

    if (expression) {
      const value = await evaluateExpression(expression, {
        ...component.props,
        render: evalRender,
        context,
        utilities,
      });

      if (component.element) {
        return `<${component.element}${
          attributes ? " " + attributes : ""
        }>${value}</${component.element}>`;
      }

      return (value as string) || "";
    }
  }

  if (
    context && component.__children && typeof component.__children === "string"
  ) {
    // TODO: What if this fails?
    const value = get({ context }, component.__children);

    if (component.element) {
      return `<${component.element}${
        attributes ? " " + attributes : ""
      }>${value}</${component.element}>`;
    }

    return (value as string) || "";
  }

  const expression = component["==children"];

  if (expression) {
    const value = await evaluateExpression(expression, {
      render: evalRender,
      context,
      utilities,
    });

    if (component.element) {
      return `<${component.element}${
        attributes ? " " + attributes : ""
      }>${value}</${component.element}>`;
    }

    return (value as string) || "";
  }

  if (component.element) {
    if (typeof component.closingCharacter === "string") {
      return `<${component.element}${
        attributes ? " " + attributes : ""
      } ${component.closingCharacter}>`;
    }

    return `<${component.element}${
      attributes ? " " + attributes : ""
    }></${component.element}>`;
  }

  return "";
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
