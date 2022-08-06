import { get, isUndefined } from "../utils/functional.ts";
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

  let element = component.element;
  const foundComponent = element && typeof element === "string" &&
    components?.[element];

  const scopedProps = component.props || props;

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
      component = extension(component, {
        props: scopedProps,
        context,
        utilities,
      });
    }

    element = component.element;
  }

  const attributes = generateAttributes(
    component.attributes,
    typeof component.props !== "string"
      ? {
        props: scopedProps,
        context,
        utilities,
      }
      : context,
    utilities,
  );

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
    } else if (children.context) {
      // TODO
    } else if (children.utility && utilities) {
      children = await applyUtility(utilities, children);
    }

    return toHTML(element, attributes, children);
  }

  if (component["##children"]) {
    return toHTML(
      element,
      attributes,
      render({
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
      return `<${element}${
        attributes ? " " + attributes : ""
      } ${component.closingCharacter}>`;
    }

    return toHTML(element, attributes);
  }

  // Maybe this has to become controllable if it should be possible to emit
  // something else than a string.
  return "";
}

function toHTML(
  element?: Component["element"],
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

function generateAttributes(
  attributes: Component["attributes"],
  context?: Context,
  utilities?: Utilities,
) {
  if (!attributes) {
    return "";
  }

  return (evaluateFields(attributes, context, utilities)).map(([k, v]) =>
    v && (v as string).length > 0 ? `${k}="${v}"` : k
  ).join(" ");
}

function evaluateFields(
  props?: Context,
  context?: Context,
  utilities?: Utilities,
) {
  if (!props) {
    return [];
  }

  return (Object.entries(props).map(([k, v]) => {
    // @ts-expect-error This is ok
    if (isUndefined(v)) {
      return [];
    }

    let value = v;

    // @ts-expect-error This is ok
    if (isUndefined(value)) {
      return [];
      // @ts-expect-error This is ok
    } else if (value.utility && utilities) {
      value = applyUtility(utilities, value as Utility);
    }

    return [k, value];
  }));
}

function applyUtility(utilities: Utilities, value: Utility) {
  return utilities[value.utility].apply(
    null,
    // @ts-ignore Ignore for now
    value.parameters || [],
  );
}

export default render;
