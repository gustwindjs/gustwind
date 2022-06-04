import { get } from "../../utils/functional.ts";
import { evaluateExpression } from "../evaluate.ts";
import type { Component, Context, Extension } from "./types.ts";

async function render({ component, extensions, context }: {
  component: Component | Component[];
  extensions?: (Extension)[];
  context?: Context;
}): Promise<string> {
  if (Array.isArray(component)) {
    return (await Promise.all(
      component.map((c) => render({ component: c, extensions })),
    )).join("");
  }

  component = extensions
    ? extensions.reduce((a, b) => b(a, context), component)
    : component;

  const attributes = await generateAttributes(component.attributes, context);

  if (component.children) {
    let children = component.children;

    if (Array.isArray(children)) {
      children = await render({ component: children, extensions });
    }

    if (component.element) {
      return `<${component.element}${
        attributes ? " " + attributes : ""
      }>${children}</${component.element}>`;
    }

    return children;
  }

  if (context) {
    if (component.__children) {
      const value = get(context, component.__children);

      if (component.element) {
        return `<${component.element}${
          attributes ? " " + attributes : ""
        }>${value}</${component.element}>`;
      }

      return (value as string) || "";
    }

    const expression = component["==children"];

    if (expression) {
      const value = await evaluateExpression(expression, context);

      if (component.element) {
        return `<${component.element}${
          attributes ? " " + attributes : ""
        }>${value}</${component.element}>`;
      }

      return (value as string) || "";
    }
  }

  if (component.__props) {
    if (component.__children) {
      const value = get(component.__props, component.__children);

      return `<${component.element}${
        attributes ? " " + attributes : ""
      }>${value}</${component.element}>`;
    }

    const expression = component["==children"];

    if (expression && typeof component.__props !== "string") {
      const value = await evaluateExpression(expression, component.__props);

      if (component.element) {
        return `<${component.element}${
          attributes ? " " + attributes : ""
        }>${value}</${component.element}>`;
      }

      return (value as string) || "";
    }
  }

  if (component.element) {
    return `<${component.element}${attributes ? " " + attributes : ""} />`;
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

      if (k.startsWith("==")) {
        key = k.split("==").slice(1).join("==");
        value = await evaluateExpression(v, context);
      }

      return `${key}="${value}"`;
    }),
  )).join("");
}

function isUndefined(str?: string) {
  return typeof str == "undefined";
}

export default render;
