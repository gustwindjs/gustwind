import { get } from "../../utils/functional.ts";
import type {
  ClassComponent,
  Component,
  Context,
  ForEachComponent,
} from "./types.ts";

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

function foreach(component: ForEachComponent, context?: Context): Component {
  if (!context || !component.foreach) {
    return component;
  }

  const [key, childComponent] = component.foreach;
  const values = get(context, key);

  if (!Array.isArray(values)) {
    return component;
  }

  return {
    ...component,
    children: values.flatMap((v) =>
      Array.isArray(childComponent)
        ? childComponent.map((c) => ({ ...c, __props: v }))
        : ({ ...childComponent, __props: v })
    ),
  };
}

export { classShortcut, foreach };
