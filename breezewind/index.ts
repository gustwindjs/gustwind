import { get, isObject, isUndefined } from "../utils/functional.ts";
import { applyUtility } from "./applyUtility.ts";
import { defaultUtilities } from "./defaultUtilities.ts";
import type {
  Component,
  Context,
  Extension,
  Utilities,
  Utility,
} from "./types.ts";

async function render(
  { component, components, extensions, context, props, utilities }: {
    component: Component | Component[];
    components?: Record<string, Component | Component[]>;
    extensions?: (Extension)[];
    context?: Context;
    props?: Context;
    utilities?: Utilities;
  },
): Promise<string> {
  // @ts-expect-error This is fine
  utilities = isObject(utilities)
    ? { ...defaultUtilities, ...utilities }
    : defaultUtilities;

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

  let scopedProps = component.props || props;

  if (component.bindToProps) {
    const boundProps = Object.fromEntries(
      await Promise.all(
        Object.entries(component.bindToProps).map(async (
          [k, v],
        ) => [
          k,
          await applyUtility(v, utilities, { context, props: scopedProps }),
        ]),
      ),
    );

    scopedProps = { ...boundProps, ...scopedProps };
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
    typeof component.props !== "string"
      ? {
        props: scopedProps,
        context,
      }
      : context,
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

  // TODO: Should this go through the utility api instead?
  // I.e. expose render as a default utility
  if (component["##children"]) {
    return toHTML(
      e,
      attributes,
      await render({
        // @ts-expect-error TODO: What if get fails?
        component: get(
          { context, props: scopedProps },
          component["##children"],
        ),
        components,
        extensions,
        context,
        utilities,
      }),
    );
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

  return (await evaluateFields(attributes, context, utilities)).map(([k, v]) =>
    v && (v as string).length > 0 ? `${k}="${v}"` : k
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

  return Promise.all(
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

      return [k, value];
    }),
  );
}

export default render;
