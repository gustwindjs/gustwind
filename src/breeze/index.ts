import { get } from "../../utils/functional.ts";
import type { Component, Extension } from "./types.ts";

function render({ component, extensions, context }: {
  component: Component | Component[];
  extensions?: (Extension)[];
  context?: Record<string, unknown>;
}): string {
  if (Array.isArray(component)) {
    return component.map((c) => render({ component: c, extensions })).join("");
  }

  component = extensions
    ? extensions.reduce((a, b) => b(a), component)
    : component;

  const attributes = generateAttributes(component.attributes);

  if (component.children) {
    let children = component.children;

    if (Array.isArray(children)) {
      children = render({ component: children, extensions });
    }

    if (component.element) {
      return `<${component.element}${
        attributes ? " " + attributes : ""
      }>${children}</${component.element}>`;
    }

    return children;
  }

  if (context && component.__children) {
    const value = get(context, component.__children);

    if (component.element) {
      return `<${component.element}${
        attributes ? " " + attributes : ""
      }>${value}</${component.element}>`;
    }

    return (value as string) || "";
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
