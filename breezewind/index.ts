import { get, isObject, isUndefined } from "../utilities/functional.ts";
import { applyUtilities, applyUtility } from "./applyUtility.ts";
import { defaultUtilities } from "./defaultUtilities.ts";
import type {
  Component,
  Context,
  Extension,
  Utilities,
  Utility,
} from "./types.ts";

type Options = {
  component: Component | Component[];
  components?: Record<string, Component | Component[]>;
  extensions?: (Extension)[];
  context?: Context;
  props?: Context;
  utilities?: Utilities;
};

async function renderWithHooks(
  options: Options,
): Promise<string> {
  const { context = {}, utilities } = options;

  utilities?._onRenderStart && utilities._onRenderStart(context);

  const ret = await render(options);

  utilities?._onRenderEnd && utilities._onRenderEnd(context);

  return ret;
}

async function render(
  { component, components, extensions, context, props, utilities }: Options,
): Promise<string> {
  const renderUtility = (_: Context, component: unknown) =>
    isComponent(component)
      // @ts-ignore: This is correct due to runtime check
      ? render({ component, components, extensions, context, utilities })
      : component;

  // @ts-expect-error This is fine
  utilities = isObject(utilities)
    ? {
      render: renderUtility,
      ...defaultUtilities,
      ...utilities,
    }
    : { render: renderUtility, ...defaultUtilities };

  if (Array.isArray(component)) {
    return (await Promise.all(component.map((c) =>
      render({
        component: c,
        components,
        extensions,
        context,
        props,
        utilities,
      })
    ))).join("");
  }

  let element = component.type;
  const foundComponent = element && typeof element === "string" &&
    components?.[element];
  let scopedProps = { ...props, ...component.props };

  if (component.bindToProps) {
    const boundProps = await applyUtilities(
      component.bindToProps,
      utilities,
      { context, props: scopedProps },
    );

    // TODO: Test this case
    scopedProps = { ...scopedProps, ...boundProps };
  }

  if (foundComponent) {
    return (await Promise.all(
      (Array.isArray(foundComponent) ? foundComponent : [foundComponent]).map((
        c,
      ) =>
        render({
          component: c,
          components,
          extensions,
          context,
          props: scopedProps,
          utilities,
        })
      ),
    )).join("");
  }

  if (extensions) {
    // Since for some declarations there are no extensions, it's possible
    // that it would be more performant first to check if an extension would
    // apply to the case (key check) than running the extension logic always.
    //
    // Doing this would mean needing a slightly more elaborate API for declaring
    // extensions.
    for (const extension of extensions) {
      component = await extension(component, {
        props: scopedProps,
        context,
      }, utilities);
    }

    element = component.type;
  }

  const attributes = await generateAttributes(
    component.attributes,
    { props: scopedProps, context },
    utilities,
  );

  let e = element;

  if (typeof element === "string") {
    // Do nothing
  } else if (element?.utility && element?.parameters) {
    e = await applyUtility(element, utilities, { context, props: scopedProps });
  }

  if (component.children) {
    let children = component.children;

    if (typeof children === "string") {
      // Nothing to do
    } else if (Array.isArray(children)) {
      children = await render({
        component: children,
        props: scopedProps,
        components,
        extensions,
        context,
        utilities,
      });
    } else if (children.utility && utilities) {
      children = await applyUtility(children, utilities, {
        context,
        props: scopedProps,
      });
    }

    return toHTML(e, attributes, children);
  }

  if (element) {
    if (typeof component.closingCharacter === "string") {
      return `<${e}${
        attributes ? " " + attributes : ""
      } ${component.closingCharacter}>`;
    }

    return toHTML(e, attributes);
  }

  // Maybe this has to become controllable if it should be possible to emit
  // something else than a string.
  return "";
}

// Note that the test here is more strict than the type itself as
// it checks against the children field.
function isComponent(input: unknown): boolean {
  if (Array.isArray(input)) {
    return input.every(isComponent);
  }

  // @ts-ignore We know it's an object by now. Maybe there's a more TS way to do this.
  return !!(isObject(input) && input.children);
}

function toHTML(
  element?: Component["type"],
  attributes?: string,
  value: unknown = "",
) {
  if (element) {
    return `<${element}${
      attributes ? " " + attributes : ""
    }>${value}</${element}>`;
  }

  return (value as string) || "";
}

async function generateAttributes(
  attributes: Component["attributes"],
  context?: Context,
  utilities?: Utilities,
) {
  if (!attributes) {
    return "";
  }

  return (await evaluateFields(attributes, context, utilities)).map(
    // @ts-expect-error This is ok
    ([k, v]) => v && (v as string).length > 0 ? `${k}="${v}"` : k,
  ).join(" ");
}

async function evaluateFields(
  props?: Context,
  context?: Context,
  utilities?: Utilities,
) {
  if (!props) {
    return [];
  }

  return (await Promise.all(
    await Object.entries(props).map(async ([k, v]) => {
      if (isUndefined(v)) {
        return [];
      }

      let value = v;

      if (isUndefined(value)) {
        return [];
        // @ts-expect-error This is ok
      } else if (value.context) {
        value = get(
          // @ts-expect-error This is ok
          get(context, value.context),
          // @ts-expect-error This is ok
          value.property,
          // @ts-expect-error This is ok
          value["default"],
        );
        // @ts-expect-error This is ok
      } else if (value.utility && utilities) {
        value = await applyUtility(value as Utility, utilities, context);
      }

      if (isUndefined(value)) {
        return;
      }

      return [k, value];
    }),
  )).filter(Boolean);
}

export default renderWithHooks;
export { isComponent };
export type { Component, Context, Extension, Utilities, Utility };
