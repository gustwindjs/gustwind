import breeze from "../../breeze/index.ts";
import * as breezeExtensions from "../../breeze/extensions.ts";

async function compile(input: string) {
  try {
    const component = JSON.parse(input);

    return await breeze({
      component,
      components: {},
      context: {},
      extensions: [
        breezeExtensions.classShortcut,
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
