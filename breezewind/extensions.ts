// This file is loaded both on client and server so it's important
// to keep related imports at minimum.
import { isObject } from "../utilities/functional.ts";
import { applyUtility } from "./applyUtility.ts";
import type {
  ClassComponent,
  ClassList,
  Component,
  Context,
  ForEachComponent,
  Utilities,
  Utility,
  VisibleIfComponent,
} from "./types.ts";

function classShortcut(tw?: (...args: string[]) => string) {
  return async function (
    component: ClassComponent,
    context: Context,
    utilities?: Utilities,
  ): Promise<Component> {
    const classes: string[] = [];

    if (typeof component.class === "string") {
      classes.push(component.class);
    } else if (typeof component.attributes?.class === "string") {
      classes.push(component.attributes.class);
    } else if (component.class?.utility && component.class.parameters) {
      classes.push(
        await applyUtility<Utility, Utilities, Context>(
          component.class,
          utilities,
          context,
        ),
      );
    }

    if (isObject(component.classList)) {
      const className = (await Promise.all(
        await Object.entries(component.classList as ClassList)
          .map(
            async ([k, values]) => {
              const firstValue = await applyUtility<
                Utility,
                Utilities,
                Context
              >(
                values[0] as Utility,
                utilities,
                context,
              );

              if (values.length === 1) {
                return firstValue;
              }

              const trues = (await Promise.all(values.map(async (v) =>
                firstValue ===
                  await applyUtility(v as Utility, utilities, context)
              ))).filter(Boolean);

              return values.length === trues.length && k;
            },
          ),
      )).filter(Boolean).join(" ");

      classes.push(className);
    }

    if (classes.length) {
      return {
        ...component,
        attributes: {
          ...component.attributes,
          class: tw ? classes.map((c) => tw(c)).join(" ") : classes.join(" "),
        },
      };
    }

    // TODO: Test this case
    return component;
  };
}

async function foreach(
  component: ForEachComponent,
  context: Context,
  utilities?: Utilities,
): Promise<Component> {
  if (!context || !component.foreach) {
    return Promise.resolve(component);
  }

  const [v, childComponent] = component.foreach;
  const values = await applyUtility(v, utilities, context);

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
  utilities?: Utilities,
): Promise<Component> {
  // TODO: Add a test against this case
  if (!component.visibleIf) {
    return component;
  }

  // Empty case - &visibleIf="()"
  if (!component.visibleIf.utility) {
    return {};
  }

  const isVisible = await applyUtility(
    component.visibleIf as Utility,
    utilities,
    context,
  );

  if (Array.isArray(isVisible)) {
    return isVisible.filter(Boolean).length > 0 ? component : {};
  }

  return isVisible ? component : {};
}

function inject(injector: (c: Component) => Promise<Component>) {
  return (component: Component) => injector(component);
}

export { classShortcut, foreach, inject, visibleIf };
