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
  if (isObject(component.class)) {
    const className = (await Promise.all(
      // TODO: Somehow component.class isn't inferred correctly here
      Object.entries(component.class as Record<string, string>).map(
        async ([k, v]) => {
          const isVisible = await evaluateExpression(v, context);

          return isVisible && k;
        },
      ),
    )).filter(Boolean).join(" ");

    return Promise.resolve({
      ...component,
      attributes: { ...component.attributes, class: tw(className) },
    });
  }

  if (typeof component.class === "string") {
    return Promise.resolve({
      ...component,
      attributes: { ...component.attributes, class: component.class },
    });
  }

  if (typeof component.__class === "string") {
    return Promise.resolve({
      ...component,
      attributes: {
        ...component.attributes,
        class: tw(
          get(context, component.__class),
        ),
      },
    });
  }

  if (typeof component["==class"] === "string") {
    return Promise.resolve({
      ...component,
      attributes: {
        ...component.attributes,
        class: tw(
          await evaluateExpression(component["==class"], context),
        ),
      },
    });
  }

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
        ? childComponent.map((c) => ({ ...c, props: v }))
        : ({ ...childComponent, props: v })
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

export { classShortcut, foreach, visibleIf };
