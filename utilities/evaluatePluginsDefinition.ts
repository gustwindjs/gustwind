import { isObject } from "./functional.ts";
import type { PluginOptions } from "../types.ts";

async function evaluatePluginsDefinition(pluginsPath: string) {
  const { env, plugins } = await Deno.readTextFile(pluginsPath).then((d) =>
    JSON.parse(d)
  );
  const fieldEvaluator = getFieldEvaluator(env);
  const ret = fieldEvaluator(plugins);

  // TODO: Drop as and type field evaluator more accurately
  return ret as PluginOptions[];
}

type Env = Record<string, string>;

function getFieldEvaluator(env: Env) {
  return function fieldEvaluator(f: unknown): unknown {
    if (Array.isArray(f)) {
      return f.map(fieldEvaluator);
    }
    if (typeof f === "string") {
      return stringTemplateParser(f, env);
    }
    if (isObject(f)) {
      return Object.fromEntries(
        Object.entries(f as Record<string, unknown>).map((
          [k, v],
        ) => [k, fieldEvaluator(v)]),
      );
    }

    return f;
  };
}

// https://stackoverflow.com/a/56920019/228885
function stringTemplateParser(expression: string, valueObj: Env) {
  const templateMatcher = /\${\s?([^{}\s]*)\s?}/g;
  const text = expression.replace(
    templateMatcher,
    (_substring, value, _index) => {
      value = valueObj[value];
      return value;
    },
  );

  return text;
}

export { evaluatePluginsDefinition };
