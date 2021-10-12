import { tw } from "twind";
import { get } from "utils";
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
    // @ts-ignore The assumption is that context exists
    context = { ...context, __bound: get(context, component.__bind) };
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
  } else if (component.__foreach) {
    const { field, render } = component.__foreach;

    // @ts-ignore: TODO: How to type this?
    const childrenToRender = context.__bound[field];

    if (!childrenToRender) {
      console.warn(
        "No children to render for",
        component,
        // @ts-ignore: TODO: How to type this?
        context.__bound,
        field,
      );
    }

    children = (await Promise.all(
      childrenToRender.flatMap((c: DataContext) =>
        Array.isArray(render)
          ? render.map((r) =>
            renderComponent(r, components, { ...context, __bound: c })
          )
          : renderComponent(render, components, {
            ...context,
            __bound: c,
          })
      ),
    )).join("");
  } else {
    children = Array.isArray(component.children)
      ? (await Promise.all(
        component.children.map(async (component) =>
          await renderComponent(component, components, context)
        ),
      )).join("")
      : component.children;
  }

  return wrapInElement(
    component.element,
    generateAttributes({
      ...component.attributes,
      class: resolveClass(component, context),
    }, context),
    await transform(component?.transformWith, children),
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

  return `<${element}${attributes}>${children}</${element}>`;
}

function generateAttributes(attributes: Attributes, context: DataContext) {
  const ret = Object.entries(attributes).map(([k, v]) => {
    if (k.startsWith("__")) {
      // @ts-ignore: TODO: How to type this?
      return `${k.slice(2)}="${context.__bound[v]}"`;
    }

    return v && `${k}="${v}"`;
  })
    .filter(Boolean).join(
      " ",
    );

  return ret.length > 0 ? " " + ret : "";
}

export { renderComponent };
