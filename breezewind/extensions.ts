// This file is loaded both on client and server so it's important
// to keep related imports at minimum.
import { tw } from "../client-deps.ts";
import { get, isObject } from "../utils/functional.ts";
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

// TODO: Consider extracting tw from this to generalize the extension
async function classShortcut(
  component: ClassComponent,
  context: Context,
  utilities?: Utilities,
): Promise<Component> {
  const classes: string[] = [];

  if (typeof component.class === "string") {
    classes.push(component.class);
  } else if (component.class?.utility && component.class.parameters) {
    classes.push(
      await applyUtility(component.class, utilities, context),
    );
  }

  if (isObject(component.classList)) {
    const className = (await Promise.all(
      await Object.entries(component.classList as ClassList)
        .map(
          async ([k, values]) => {
            const firstValue = await applyUtility(
              values[0] as Utility,
              utilities,
              context,
            );
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
        class: classes.map((c) => tw(c)).join(" "),
      },
    };
  }

  // TODO: Test this case
  return component;
}

// TODO: Refactor to go through applyUtility to make this more flexible
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
  utilities?: Utilities,
): Promise<Component> {
  if (!Array.isArray(component.visibleIf)) {
    return Promise.resolve(component);
  }

  if (component.visibleIf.length === 0) {
    return Promise.resolve({});
  }

  const trues = (await Promise.all(
    component.visibleIf.map(async (v) =>
      await applyUtility(v as Utility, utilities, context)
    ),
  )).filter(Boolean);
  const isVisible = trues.length === component.visibleIf.length;

  return Promise.resolve(isVisible ? component : {});
}

function inject(injector: (c: Component) => Promise<Component>) {
  return (component: Component) => {
    return injector(component);
  };
}

export { classShortcut, foreach, inject, visibleIf };
