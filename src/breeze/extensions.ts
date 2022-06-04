import type { ClassComponent, Component } from "./types.ts";

function classShortcut(component: ClassComponent): Component {
  return {
    ...component,
    attributes: {
      ...component.attributes,
      class: component.class,
      __class: component.__class,
      "==class": component["==class"],
    },
  };
}

export { classShortcut };
