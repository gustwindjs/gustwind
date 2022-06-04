import type { Component, Extension } from "./types.ts";

function render(
  component: Component | Component[],
  extensions?: Extension[],
): string {
  if (Array.isArray(component)) {
    return component.map((c) => render(c, extensions)).join("");
  }

  const attributes = generateAttributes(component.attributes);

  if (component.children) {
    let children = component.children;

    if (Array.isArray(children)) {
      children = children.map((c) => render(c, extensions)).join("");
    }

    if (component.element) {
      return `<${component.element}${
        attributes ? " " + attributes : ""
      }>${children}</${component.element}>`;
    }

    return children;
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

  return Object.entries(attributes).map(([k, v]) => `${k}="${v}"`).join("");
}

export default render;
