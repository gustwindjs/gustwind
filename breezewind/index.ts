import { get, isUndefined } from "../utils/functional.ts";
import { evaluateExpression } from "../utils/evaluate.ts";
import type { Component, Context, Extension, Utilities } from "./types.ts";

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
    return (await Promise.all(
      component.map((c) =>
        render({
          component: c,
          components,
          extensions,
          context,
          props,
          utilities,
        })
      ),
    )).join("");
  }

  let element = component.element;
  const foundComponent = element && components?.[element];

  const scopedProps = Object.fromEntries(
    await evaluateFields(component.props || props, {
      context,
      props: props,
    }),
  );

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
        utilities,
      });
    }

    element = component.element;
  }

  if (component.__element) {
    element = (get({ context, props: scopedProps }, component.__element) ||
      element) as string;
  }

  if (component["==element"]) {
    element = await evaluateExpression(component["==element"], {
      props: scopedProps,
      context,
      utilities,
    });
  }

  const attributes = await generateAttributes(
    component.attributes,
    typeof component.props !== "string"
      ? {
        props: scopedProps,
        context,
        utilities,
      }
      : context,
  );

  if (component.children) {
    let children = component.children;

    if (Array.isArray(children)) {
      children = await render({
        component: children,
        props: scopedProps,
        components,
        extensions,
        context,
        utilities,
      });
    }

    return toHTML(element, attributes, children);
  }

  if (component.__children) {
    // TODO: What if get fails?
    return toHTML(
      element,
      attributes,
      get({ context, props: scopedProps }, component.__children),
    );
  }

  if (component["##children"]) {
    return toHTML(
      element,
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

  const expression = component["==children"];

  if (expression) {
    return toHTML(
      element,
      attributes,
      await evaluateExpression(expression, {
        props: scopedProps,
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

async function generateAttributes(
  attributes: Component["attributes"],
  context?: Context,
): Promise<string> {
  if (!attributes) {
    return "";
  }

  return (await evaluateFields(attributes, context)).map(([k, v]) =>
    v && (v as string).length > 0 ? `${k}="${v}"` : k
  ).join(" ");
}

async function evaluateFields(props?: Context, context?: Context) {
  if (!props) {
    return Promise.resolve([]);
  }

  return (await Promise.all(
    Object.entries(props).map(async ([k, v]) => {
      // @ts-expect-error This is ok
      if (isUndefined(v)) {
        return [];
      }

      let key = k;
      let value = v;

      if (k.startsWith("__")) {
        key = k.split("__").slice(1).join("__");

        // TODO: What if value isn't found?
        // @ts-expect-error This is ok
        value = get(context, v) as string;
      }

      if (k.startsWith("==") && typeof v === "string") {
        key = k.split("==").slice(1).join("==");
        value = await evaluateExpression(v, context);
      }

      // @ts-expect-error This is ok
      if (isUndefined(value)) {
        return [];
      }

      return [key, value];
    }),
  ));
}

export default render;
