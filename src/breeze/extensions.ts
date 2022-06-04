import { get, isObject } from "../../utils/functional.ts";
import { evaluateExpression } from "../evaluate.ts";
import type {
  ClassComponent,
  Component,
  Context,
  ForEachComponent,
  VisibleIfComponent,
} from "./types.ts";

async function classShortcut(
  component: ClassComponent,
  context: Context,
): Promise<Component> {
  if (isObject(component.class)) {
    const className = (await Promise.all(
      // TODO: Somehow component.class isn't inferred correctly here
      Object.entries(component.class as Record<string, string>).map(
        async ([k, v]) => {
          const isVisible = await evaluateExpression(v, { context });

          return isVisible && k;
        },
      ),
    )).filter(Boolean).join(" ");

    return Promise.resolve({
      ...component,
      attributes: { ...component.attributes, class: className },
    });
  }

  // @ts-ignore: TODO: Somehow the type check fails above
  return Promise.resolve({
    ...component,
    attributes: {
      ...component.attributes,
      class: component.class,
      __class: component.__class,
      "==class": component["==class"],
    },
  });
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
  const isVisible = await evaluateExpression(component.visibleIf, {
    ...component.props,
    context,
  });

  return isVisible ? component : {};
}

export { classShortcut, foreach, visibleIf };
