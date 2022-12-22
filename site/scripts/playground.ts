// Note that the editor depends on the editor plugin that's exposing
// Twind registation!
import breeze from "../../breezewind/index.ts";
import * as breezeExtensions from "../../breezewind/extensions.ts";

// @ts-expect-error This is fine for now
let cachedTw;

function getTw() {
  // @ts-expect-error This is fine for now
  if (cachedTw) {
    return Promise.resolve(cachedTw);
  }

  return new Promise((resolve) => {
    // @ts-expect-error This is fine for now
    window.registerTwListener((tw) => {
      cachedTw = tw;

      resolve(tw);
    });
  });
}

// TODO: How to make this wait until tw registration is done?
async function compile(input: string) {
  try {
    const tw = await getTw();
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
