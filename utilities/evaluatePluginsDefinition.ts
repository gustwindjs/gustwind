import type { PluginsDefinition } from "../types.ts";

function evaluatePluginsDefinition(
  { env, plugins }: PluginsDefinition,
): PluginsDefinition["plugins"] {
  // @ts-expect-error This is fine. There is some weirdness in the type definition or TypeScript
  return plugins.map((plugin) =>
    plugin.module ? plugin : ({
      ...plugin,
      module: null,
      path: stringTemplateParser(plugin.path, env),
    })
  );
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
