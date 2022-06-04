import { get } from "../../utils/functional.ts";
import { evaluateExpression } from "../evaluate.ts";
import type { Component, Extension } from "./types.ts";

async function render({ component, extensions, context }: {
  component: Component | Component[];
  extensions?: (Extension)[];
  context?: Record<string, unknown>;
}): Promise<string> {
  if (Array.isArray(component)) {
    return (await Promise.all(
      component.map((c) => render({ component: c, extensions })),
    )).join("");
  }

  component = extensions
    ? extensions.reduce((a, b) => b(a), component)
    : component;

  const attributes = generateAttributes(component.attributes);

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

  if (component.element) {
    return `<${component.element}${attributes ? " " + attributes : ""} />`;
  }

  return "";
}

function generateAttributes(attributes: Component["attributes"]): string {
  if (!attributes) {
    return "";
  }

  return Object.entries(attributes).map(([k, v]) =>
    isUndefined(v) ? "" : `${k}="${v}"`
  ).join("");
}

function isUndefined(str?: string) {
  return typeof str == "undefined";
}

export default render;
