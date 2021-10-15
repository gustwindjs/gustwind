import { tw } from "twind";
import { get, isObject } from "./utils.ts";
import type {
  Attributes,
  Component,
  Components,
  DataContext,
} from "../types.ts";
import transform from "./transform.ts";

async function renderComponent(
  component: Component | string,
  components: Components,
  context: DataContext,
): Promise<string> {
  if (typeof component === "string") {
    return component;
  }

  const foundComponent = components[component.component!];

  if (component.__bind) {
    if (isObject(component.__bind)) {
      context = { ...context, __bound: component.__bind };
    } else {
      context = { ...context, __bound: get(context, component.__bind) };
    }

    console.log("binding", context);
  }

  if (foundComponent) {
    return await renderComponent(
      {
        children: Array.isArray(foundComponent) ? foundComponent : [{
          ...component,
          ...foundComponent,
          class: joinClasses(
            component.class as string,
            foundComponent.class as string,
          ),
          component: "",
        }],
      },
      components,
      context,
    );
  }

  let children: string | undefined;

  if (component.__children) {
    const boundChildren = component.__children;

    // @ts-ignore: Figure out how to type __bound
    const ctx = context.__bound || context;

    if (typeof boundChildren === "string") {
      children = get(ctx, boundChildren);
    } else {
      children = (
        await Promise.all(
          (Array.isArray(ctx) ? ctx : [ctx]).flatMap((d) =>
            boundChildren.map((c) =>
              renderComponent(c, components, { ...context, __bound: d })
            )
          ),
        )
      ).join("");
    }
  } else {
    children = Array.isArray(component.children)
      ? (await Promise.all(
        component.children.map(async (component) =>
          await renderComponent(component, components, context)
        ),
      )).join("")
      : component.children;
  }

  const content = await transform(component?.transformWith, children);

  return wrapInElement(
    component.element,
    generateAttributes({
      ...component.attributes,
      class: resolveClass(component, context),
    }, context),
    component?.selectProperty && isObject(content)
      // @ts-ignore: Rework how transformed values are selected
      ? content[component.selectProperty]
      : content,
  );
}

function resolveClass(component: Component, context: DataContext) {
  const classes: string[] = [];

  if (component.__class) {
    Object.entries(component.__class).forEach(([klass, expression]) => {
      if (
        evaluateExpression(expression, {
          attributes: component.attributes,
          context,
        })
      ) {
        classes.push(klass);
      }
    });
  }

  if (!component.class) {
    return classes.join(" ");
  }

  return tw(classes.concat(component.class.split(" ")).join(" "));
}

// From Sidewind
function evaluateExpression(
  expression: string,
  value: Record<string, unknown> = {},
) {
  try {
    return Function.apply(
      null,
      Object.keys(value).concat(`return ${expression}`),
    )(...Object.values(value));
  } catch (err) {
    console.error("Failed to evaluate", expression, value, err);
  }
}

function joinClasses(a?: string, b?: string) {
  if (a) {
    if (b) {
      return `${a} ${b}`;
    }

    return a;
  }

  return b || "";
}

function wrapInElement(
  element: Component["element"],
  attributes: string,
  children?: unknown,
): string {
  if (!element) {
    return typeof children === "string" ? children : "";
  }

  return `<${element}${attributes}>${children || ""}</${element}>`;
}

function generateAttributes(attributes: Attributes, context: DataContext) {
  const ret = Object.entries(attributes).map(([k, v]) => {
    if (k.startsWith("__")) {
      return `${k.slice(2)}="${
        // TODO: Figure out the correct way to apply JSON.stringify as that's
        // probably not the right default behavior here.
        // @ts-ignore: TODO: How to type this?
        context.__bound
          // @ts-ignore: TODO: How to type this?
          ? context.__bound[v]
          : // @ts-ignore: TODO: How to type this?
            encodeURIComponent(JSON.stringify(context[v]))
      }"`;
    }

    return `${k}="${v}"`;
  })
    .filter(Boolean).join(
      " ",
    );

  return ret.length > 0 ? " " + ret : "";
}

export { renderComponent };
