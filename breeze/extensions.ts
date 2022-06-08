// This file is loaded both on client and server so it's important
// to keep related imports at minimum.
import { tw } from "../client-deps.ts";
import { get, isObject } from "../utils/functional.ts";
import { evaluateExpression } from "../utils/evaluate.ts";
import type {
  ClassComponent,
  Component,
  Context,
  ForEachComponent,
  VisibleIfComponent,
} from "./types.ts";

// TODO: Consider extracting tw from this to generalize the extension
async function classShortcut(
  component: ClassComponent,
  context: Context,
): Promise<Component> {
  const classes: string[] = [];

  if (typeof component.class === "string") {
    classes.push(component.class);
  }

  if (typeof component.__class === "string") {
    classes.push(get(context, component.__class) as string);
  }

  if (typeof component["==class"] === "string") {
    classes.push(await evaluateExpression(component["==class"], context));
  }

  if (isObject(component.classList)) {
    const className = (await Promise.all(
      Object.entries(component.classList as Record<string, string>).map(
        async ([k, v]) => {
          const isVisible = await evaluateExpression(v, context);

          return isVisible && k;
        },
      ),
    )).filter(Boolean).join(" ");

    classes.push(className);
  }

  if (classes.length) {
    return Promise.resolve({
      ...component,
      attributes: {
        ...component.attributes,
        class: classes.map((c) => tw(c)).join(" "),
      },
    });
  }

  // TODO: Test this case
  return Promise.resolve(component);
}

function foreach(
  component: ForEachComponent,
  context: Context,
): Promise<Component> {
  if (!context || !component.foreach) {
    return Promise.resolve(component);
  }

  const [key, childComponent] = component.foreach;
  const values = get(context, key);

  if (!Array.isArray(values)) {
    return Promise.resolve(component);
  }

  return Promise.resolve({
    ...component,
    children: values.flatMap((v) =>
      Array.isArray(childComponent)
        ? childComponent.map((c) => ({
          ...c,
          props: isObject(v) ? v : { value: v },
        }))
        : ({ ...childComponent, props: isObject(v) ? v : { value: v } })
    ),
  });
}

async function visibleIf(
  component: VisibleIfComponent,
  context: Context,
): Promise<Component> {
  if (typeof component.visibleIf !== "string") {
    return Promise.resolve(component);
  }

  const isVisible = await evaluateExpression(component.visibleIf, context);

  return isVisible ? component : {};
}

function inject(injector: (c: Component) => Component) {
  return (component: Component) => {
    return Promise.resolve(injector(component));
  };
}

export { classShortcut, foreach, inject, visibleIf };
