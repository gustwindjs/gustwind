import { get } from "../utils/functional.ts";
import type { Attributes, DataContext } from "../types.ts";

function evaluateFields(context?: DataContext, attributes?: Attributes) {
  if (!context || !attributes) {
    return [];
  }

  return Object.entries(attributes).map(([k, v]) =>
    evaluateField(context, k, v)
  );
}

function evaluateField(
  context: DataContext,
  k: string,
  v: string,
): [string, string] {
  if (k.startsWith("__")) {
    // @ts-ignore: TODO: How to type __bound
    return [k.slice(2), get(context.__bound, v) || get(context, v)];
  } else if (k.startsWith("==")) {
    return [
      k.slice(2),
      evaluateExpression(
        v,
        // @ts-ignore: TODO: How to type __bound
        context.__bound || context,
      ),
    ];
  }

  return [k, v];
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

export { evaluateExpression, evaluateField, evaluateFields };
