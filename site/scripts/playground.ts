import { install, tw } from "https://cdn.skypack.dev/@twind/core@1.1.1?min";
import presetTailwind from "https://esm.sh/@twind/preset-tailwind@1.1.1";
import breeze from "../../breezewind/mod.ts";
import * as breezeExtensions from "../../breezewind/extensions.ts";

install({ presets: [presetTailwind()], hash: false });

// TODO: How to make this wait until tw registration is done?
async function compile(input: string) {
  try {
    const component = JSON.parse(input);

    return await breeze({
      component,
      components: {},
      context: {},
      extensions: [
        breezeExtensions.visibleIf,
        breezeExtensions.classShortcut(tw),
        breezeExtensions.foreach,
      ],
    });
  } catch (_error) {
    console.error(_error, input);

    return Promise.resolve("Failed to parse JSON");
  }
}

declare global {
  interface Window {
    compile: typeof compile;
  }
}

if (!("Deno" in globalThis)) {
  console.log("Hello from the playground");

  window.compile = compile;
}

export { compile };
