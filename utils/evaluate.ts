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
    // @ts-ignore: TODO: How to type this
    return [k.slice(2), get(context, v)];
  } else if (k.startsWith("==")) {
    return [
      k.slice(2),
      await evaluateExpression(
        v,
        // @ts-ignore: TODO: How to type this
        isObject(context) ? context : { data: context },
      ),
    ];
  }

  return [k, v];
}

// From Sidewind
function evaluateExpression(
  expression: string,
  value: Record<string, unknown> = {},
  showErrors = true,
) {
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
