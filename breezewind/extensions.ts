// This file is loaded both on client and server so it's important
// to keep related imports at minimum.
import { tw } from "../client-deps.ts";
import { get, isObject } from "../utils/functional.ts";
import type {
  ClassComponent,
  ClassList,
  ClassOptions,
  Component,
  Context,
  ForEachComponent,
  VisibleIfComponent,
} from "./types.ts";

// TODO: Consider extracting tw from this to generalize the extension
function classShortcut(
  component: ClassComponent,
  context: Context,
): Component {
  const classes: string[] = [];

  if (typeof component.class === "string") {
    classes.push(component.class);
  }

  if (typeof component.__class === "string") {
    classes.push(get(context, component.__class) as string);
  }

  if (isObject(component.classList)) {
    const className = (Object.entries(component.classList as ClassList)
      .map(
        ([k, values]) => {
          const firstValue = getValue(context, values[0]);

          return values.every((v) => firstValue === getValue(context, v))
            ? k
            : false;
        },
      )).filter(Boolean).join(" ");

    classes.push(className);
  }

  if (classes.length) {
    return {
      ...component,
      attributes: {
        ...component.attributes,
        class: classes.map((c) => tw(c)).join(" "),
      },
    };
  }

  // TODO: Test this case
  return component;
}

function getValue(context: Context, v: ClassOptions) {
  return v.context ? context[v.property] : v.value;
}

function foreach(
  component: ForEachComponent,
  context: Context,
): Component {
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
        ? childComponent.map((c) => ({
          ...c,
          props: isObject(v) ? v : { value: v },
        }))
        : ({ ...childComponent, props: isObject(v) ? v : { value: v } })
    ),
  };
}

function visibleIf(component: VisibleIfComponent, context: Context): Component {
  if (!Array.isArray(component.visibleIf)) {
    return component;
  }

  if (component.visibleIf.length === 0) {
    return {};
  }

  const isVisible = component.visibleIf.every((v) =>
    // @ts-ignore TODO: Figure out how to type this
    context[v.context][v.property]
  );

  return isVisible ? component : {};
}

function inject(injector: (c: Component) => Component) {
  return (component: Component) => {
    return injector(component);
  };
}

export { classShortcut, foreach, inject, visibleIf };
