import type { ClassComponent, Component } from "./types.ts";

function classShortcut(component: ClassComponent): Component {
  // TODO: Move class to attributes
  return {
    ...component,
    attributes: {
      ...component.attributes,
      class: component.class,
    },
  };
}

export { classShortcut };
