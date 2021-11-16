import { tw } from "https://cdn.skypack.dev/twind@0.16.16?min";
import { get, isObject } from "../utils/functional.ts";
import type {
  Attributes,
  Component,
  Components,
  DataContext,
} from "../types.ts";
import { transform } from "./transform.ts";

async function renderComponent(
  transformsPath: string,
  component: Component | string,
  components: Components,
  context: DataContext,
): Promise<string> {
  if (typeof component === "string") {
    return component;
  }

  const foundComponent = component.element && components[component.element];

  if (component.__bind) {
    if (isObject(component.__bind)) {
      context = { ...context, __bound: component.__bind };
    } else {
      context = { ...context, __bound: get(context, component.__bind) };
    }
  }

  if (foundComponent) {
    return await renderComponent(
      transformsPath,
      {
        element: "",
        children: Array.isArray(foundComponent) ? foundComponent : [{
          ...component,
          ...foundComponent,
          class: joinClasses(
            component.class as string,
            foundComponent.class as string,
          ),
        }],
      },
      components,
      context,
    );
  }

  if (component?.transformWith) {
    let transformedContext;

    if (typeof component.inputText === "string") {
      transformedContext = await transform(
        transformsPath,
        component?.transformWith,
        component.inputText,
      );
    } else if (typeof component.inputProperty === "string") {
      const input = get(context, component.inputProperty as string);

      if (!input) {
        console.error(
          "Missing input",
          context,
          component.inputProperty as string,
        );

        throw new Error("Missing input");
      }

      transformedContext = await transform(
        transformsPath,
        component?.transformWith,
        input,
      );
    }

    context = { ...context, ...transformedContext };
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
              renderComponent(transformsPath, c, components, {
                ...context,
                __bound: d,
              })
            )
          ),
        )
      ).join("");
    }
  } else {
    children = Array.isArray(component.children)
      ? (await Promise.all(
        component.children.map(async (component) =>
          await renderComponent(transformsPath, component, components, context)
        ),
      )).join("")
      : component.children;
  }

  const klass = resolveClass(component, context);

  return wrapInElement(
    component.element,
    generateAttributes(
      context,
      klass
        ? {
          ...component.attributes,
          class: klass,
        }
        : component.attributes,
    ),
    children,
  );
}

function resolveClass(
  component: Component,
  context: DataContext,
): string | undefined {
  const classes: string[] = [];

  if (component.__class) {
    Object.entries(component.__class).forEach(([klass, expression]) => {
      if (
        evaluateExpression(expression, {
          attributes: component.attributes,
          context,
        })
      ) {
        classes.push(tw(klass));
      }
    });
  }

  if (!component.class) {
    return classes.join(" ");
  }

  return tw(classes.concat(component.class.split(" ")).join(" "));
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

function generateAttributes(context: DataContext, attributes?: Attributes) {
  if (!attributes) {
    return "";
  }

  const ret = Object.entries(attributes).map(([k, v]) => {
    if (k.startsWith("__")) {
      return `${k.slice(2)}="${
        evaluateExpression(
          v,
          // @ts-ignore: TODO: How to type this?
          context.__bound,
        )
      }"`;
    }

    return `${k}="${v}"`;
  })
    .filter(Boolean).join(
      " ",
    );

  return ret.length > 0 ? " " + ret : "";
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

export { renderComponent };
