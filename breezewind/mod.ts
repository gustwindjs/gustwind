import { get, isObject, isUndefined, omit } from "../utilities/functional.ts";
import { applyUtilities, applyUtility } from "./applyUtility.ts";
import { defaultUtilities } from "./defaultUtilities.ts";
import type {
  Component,
  Components,
  Context,
  Extension,
  Utilities,
  Utility,
} from "./types.ts";

type Options = {
  component: string | Component | Component[];
  components?: Components;
  extensions?: (Extension)[];
  context?: Context;
  props?: Context;
  globalUtilities?: Utilities;
  componentUtilities?: Record<string, Utilities>;
};

async function renderWithHooks(
  options: Options,
): Promise<string> {
  const { context = {}, globalUtilities } = options;

  globalUtilities?._onRenderStart && globalUtilities._onRenderStart(context);

  const ret = await render(options);

  globalUtilities?._onRenderEnd && globalUtilities._onRenderEnd(context);

  return ret;
}

async function render(
  {
    component,
    components,
    extensions,
    context,
    props,
    globalUtilities,
    componentUtilities,
  }: Options,
): Promise<string> {
  if (typeof component === "string") {
    return component;
  }

  const renderUtility = (component: unknown) =>
    isComponent(component)
      // @ts-ignore: This is correct due to runtime check
      ? render({ component, components, extensions, context, globalUtilities })
      : component;

  // @ts-expect-error This is fine
  globalUtilities = isObject(globalUtilities)
    ? {
      render: renderUtility,
      ...defaultUtilities,
      ...globalUtilities,
    }
    : { render: renderUtility, ...defaultUtilities };

  if (Array.isArray(component)) {
    return (await Promise.all(component.map((c) =>
      render({
        component: c,
        components,
        extensions,
        context,
        // TODO: Test this case
        props: { children: c.children, ...props },
        globalUtilities,
      })
    ))).join("");
  }

  // TODO: Test this case
  if (!isObject(component)) {
    return "";
  }

  let element = component.type;
  const foundComponent = element && typeof element === "string" &&
      components?.[element] && isObject(components?.[element])
    ? { ...omit(component, "type"), ...components?.[element] }
    // @ts-expect-error This is fine
    : components?.[element];
  let scopedProps = { ...props, ...component.props };

  if (component.bindToProps) {
    const boundProps = await applyUtilities(
      component.bindToProps,
      globalUtilities,
      { context, props: scopedProps },
    );

    scopedProps = { ...scopedProps, ...boundProps };
  }

  if (foundComponent) {
    // Bind component specific utilities if they exist
    const utilities = {
      ...globalUtilities,
      ...componentUtilities?.[element as string],
    };

    return (await Promise.all(
      (Array.isArray(foundComponent) ? foundComponent : [foundComponent]).map((
        c,
      ) =>
        render({
          component: c,
          components,
          extensions,
          context,
          props: {
            ...scopedProps,
            // @ts-ignore: This is fine
            children: component.children,
          },
          globalUtilities: utilities,
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
      }, globalUtilities);
    }

    element = component.type;
  }

  const attributes = await generateAttributes(
    component.attributes,
    { props: scopedProps, context },
    globalUtilities,
  );

  let e = element;

  if (typeof element === "string") {
    // Do nothing
  } else if (element?.utility && element?.parameters) {
    e = await applyUtility(element, globalUtilities, {
      context,
      props: scopedProps,
    });
  }

  if (component.children) {
    let children = component.children;

    if (typeof children === "string") {
      // Nothing to do
    } else if (Array.isArray(children)) {
      const component = await Promise.all(children.map((child) => {
        if (typeof child === "string") {
          return child;
        }
        // @ts-expect-error This is fine
        if (child.utility) {
          // @ts-expect-error This is fine
          return applyUtility(child, globalUtilities, {
            context,
            props: scopedProps,
          });
        }
        return child;
      }));

      children = await render({
        component,
        props: scopedProps,
        components,
        extensions,
        context,
        globalUtilities,
      });
    } else if (children.utility && globalUtilities) {
      children = await applyUtility(children, globalUtilities, {
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

  // Input is component if it is an object and has either children or type property.
  // @ts-expect-error We know it's an object by now. Maybe there's a more TS way to do this.
  return !!(isObject(input) && (input.children || input.type));
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
