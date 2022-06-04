import { get, isObject } from "../utils/functional.ts";
import type { Attributes, DataContext } from "../types.ts";

function evaluateFields(context?: DataContext, attributes?: Attributes) {
  if (!context || !attributes) {
    return [];
  }

  return Promise.all(
    Object.entries(attributes).map(([k, v]) => evaluateField(context, k, v)),
  );
}

async function evaluateField(
  context: DataContext,
  k: string,
  v: string,
): Promise<[string, string]> {
  if (k.startsWith("__")) {
    // @ts-ignore: TODO: How to type __bound
    return [k.slice(2), get(context.__bound, v) || get(context, v)];
  } else if (k.startsWith("==")) {
    // @ts-ignore: TODO: How to type __bound
    const ctx = context.__bound || context;

    return [
      k.slice(2),
      await evaluateExpression(
        v,
        isObject(ctx) ? ctx : { data: ctx },
      ),
    ];
  }

  return [k, v];
}

// From Sidewind
function evaluateExpression(
  expression: string | undefined,
  value: Record<string, unknown> = {},
  showErrors = true,
) {
  if (!expression) {
    return Promise.resolve("");
  }

  try {
    return Promise.resolve(
      Function.apply(
        null,
        Object.keys(value).concat(`return ${expression}`),
      )(...Object.values(value)),
    );
  } catch (err) {
    showErrors && console.error("Failed to evaluate", expression, value, err);
  }
}

export { evaluateExpression, evaluateField, evaluateFields };
