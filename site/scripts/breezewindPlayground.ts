import { install, tw } from "https://cdn.skypack.dev/@twind/core@1.1.1?min";
import presetTailwind from "https://esm.sh/@twind/preset-tailwind@1.1.1";
import breeze, { type Options } from "../../breezewind/mod.ts";
import * as breezeExtensions from "../../breezewind/extensions.ts";

install({ presets: [presetTailwind()], hash: false });

// TODO: How to make this wait until tw registration is done?
function compile(input: string) {
  try {
    const component = JSON.parse(input);

    return compileBreezewind(component);
  } catch (_error) {
    console.error(_error, input);

    return Promise.resolve("Failed to parse JSON");
  }
}

function compileBreezewind(component: Options["component"]) {
  return breeze({
    component,
    components: {},
    context: {},
    extensions: [
      breezeExtensions.visibleIf,
      // @ts-expect-error This is fine
      breezeExtensions.classShortcut(tw),
      breezeExtensions.foreach,
    ],
  });
}

declare global {
  interface Window {
    compile: typeof compile;
  }
}

if (!("Deno" in globalThis)) {
  console.log("Hello from the breezewind playground");

  window.compile = compile;
}

export { compile, compileBreezewind };
