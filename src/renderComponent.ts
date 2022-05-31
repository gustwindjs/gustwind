import { tw } from "https://cdn.skypack.dev/twind@0.16.16?min";
import { get, isObject } from "../utils/functional.ts";
import type {
  Attributes,
  Component,
  Components,
  DataContext,
} from "../types.ts";
import { transform } from "./transform.ts";
import { evaluateExpression, evaluateFields } from "./evaluate.ts";

async function renderComponent(
  transformsPath: string,
  component: Component | string,
  components: Components,
  context: DataContext,
  pageUtilities = {},
): Promise<string> {
  if (typeof component === "string") {
    return component;
  }

  if (component.visibleIf) {
    // @ts-ignore: Figure out how to type __bound
    const ctx = context.__bound || context;

    if (!(component.visibleIf in ctx)) {
      return Promise.resolve("");
    }

    const showComponent = await evaluateExpression(
      component.visibleIf,
      ctx,
    );

    if (!showComponent) {
      return Promise.resolve("");
    }
  }

  const foundComponent = component.element && components[component.element];

  if (component.__bind) {
    if (isObject(component.__bind)) {
      context = {
        ...context,
        __bound: {
          ...pageUtilities,
          ...context,
          render: (structure: Component | string) =>
            renderComponent(
              transformsPath,
              structure,
              components,
              context,
              pageUtilities,
            ),
          // @ts-ignore We know __bind is an object by now.
          ...resolveContext(component.__bind, context),
        },
      };
    } else {
      // TODO: Should __bound become an object always? Then it could contain
      // main context and page utilities as well.
      context = {
        ...context,
        __bound: get(context, component.__bind) ||
          // @ts-ignore It's important to check possibly bound context too
          get(context.__bound, component.__bind),
      };
    }
  }

  if (foundComponent) {
    if (Array.isArray(foundComponent)) {
      return await renderComponent(
        transformsPath,
        {
          element: "",
          children: foundComponent,
        },
        components,
        context,
        pageUtilities,
      );
    }

    component = {
      ...component,
      ...foundComponent,
      element: foundComponent.element,
      class: joinClasses(
        component.class as string,
        foundComponent.class as string,
      ),
    };
  }

  if (component?.transformWith) {
    let transformedContext;

    if (typeof component.inputText === "string") {
      transformedContext = await transform(
        "production",
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
        "production",
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
      // TODO: Maybe it's better to do an existence check here to avoid trouble
      // with nullables
      children = get(ctx, boundChildren) || get(context, boundChildren);
    } else {
      children = (
        await Promise.all(
          (Array.isArray(ctx) ? ctx : [ctx]).flatMap((d) =>
            boundChildren.map((c) =>
              renderComponent(transformsPath, c, components, {
                ...context,
                __bound: d,
              }, pageUtilities)
            )
          ),
        )
      ).join("");
    }
  } else if (component["==children"]) {
    const childrenToEvaluate = component["==children"];

    // @ts-ignore: Figure out how to type __bound
    const ctx = context.__bound || context;

    children = await evaluateExpression(
      childrenToEvaluate,
      isObject(ctx)
        ? { ...pageUtilities, ...ctx }
        : { ...pageUtilities, data: ctx },
    );
  } else if (component.__foreach) {
    // This is similar to __children but with a nicer binding (['value', Component[]])
    const [value, boundChildren] = component.__foreach;

    // @ts-ignore: Figure out how to type __bound
    const ctx = context.__bound || context;

    children = (
      await Promise.all(
        ctx[value].flatMap((d: unknown) =>
          (Array.isArray(boundChildren) ? boundChildren : [boundChildren]).map((
            c,
          ) =>
            renderComponent(transformsPath, c, components, {
              ...context,
              __bound: d,
              // Attach match to the context. The gotcha with this is
              // that it leads to an inconsistent system.
              // Example. "match.value" would always perform a lookup
              // TODO: Likely a convention (__value for key) is needed to solve this.
              match: d,
            }, pageUtilities)
          )
        ),
      )
    ).join("");
  } else {
    children = Array.isArray(component.children)
      ? (await Promise.all(
        component.children.map(async (component) =>
          await renderComponent(
            transformsPath,
            component,
            components,
            context,
            pageUtilities,
          )
        ),
      )).join("")
      : component.children;
  }

  const klass = await resolveClass(component, context, pageUtilities);

  return wrapInElement(
    component.element,
    await generateAttributes(
      { ...pageUtilities, ...context },
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

function resolveContext(
  kv: Record<string, unknown>,
  context: Record<string, unknown>,
) {
  const ret: Record<string, unknown> = {};

  Object.entries(kv).forEach(([k, v]) => {
    // @ts-ignore TODO: Assume this is fine for now
    ret[k] = get(context, v) || v;
  });

  return ret;
}

async function resolveClass(
  component: Component,
  context: DataContext,
  pageUtilities: Record<string, unknown>,
): Promise<string | undefined> {
  const classes: string[] = [];

  if (component.__class) {
    await Object.entries(component.__class).forEach(
      async ([klass, expression]) => {
        if (
          await evaluateExpression(expression, {
            attributes: component.attributes,
            context: { ...pageUtilities, ...context },
          })
        ) {
          classes.push(tw(klass));
        }
      },
    );
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

  return `<${element}${attributes ? " " + attributes : ""}>${
    children || ""
  }</${element}>`;
}

async function generateAttributes(
  context: DataContext,
  attributes?: Attributes,
) {
  if (!attributes) {
    return "";
  }

  const fields = await evaluateFields(context, attributes);

  return fields.map(([k, v]) => isUndefined(v) ? "" : `${k}="${v}"`)
    .join(" ");
}

function isUndefined(str: string) {
  return typeof str == "undefined";
}

export { renderComponent };
