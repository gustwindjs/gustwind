import { tw } from "https://cdn.skypack.dev/twind@0.16.16?min";
import breeze from "../../breezewind/index.ts";
import * as breezeExtensions from "../../breezewind/extensions.ts";

async function compile(input: string) {
  try {
    const component = JSON.parse(input);

    return await breeze({
      component,
      components: {},
      context: {},
      extensions: [
        breezeExtensions.classShortcut(tw),
        breezeExtensions.foreach,
        breezeExtensions.visibleIf,
      ],
    });
  } catch (_error) {
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
