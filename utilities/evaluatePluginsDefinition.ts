import type { PluginsDefinition } from "../types.ts";

function evaluatePluginsDefinition(
  { env, plugins }: PluginsDefinition,
): PluginsDefinition["plugins"] {
  return plugins.map((plugin) => ({
    ...plugin,
    path: stringTemplateParser(plugin.path, env),
  }));
}

// https://stackoverflow.com/a/56920019/228885
function stringTemplateParser(
  expression: string,
  valueObj: PluginsDefinition["env"],
) {
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
