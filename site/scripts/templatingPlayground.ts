import { htmlToBreezewind } from "../../html-to-breezewind/mod.ts";

function compile(input: string) {
  try {
    return htmlToBreezewind(input);
  } catch (_error) {
    console.error(_error, input);

    return Promise.resolve("Failed to convert input");
  }
}

declare global {
  interface Window {
    compile: typeof compile;
  }
}

if (!("Deno" in globalThis)) {
  console.log("Hello from the templating playground");

  window.compile = compile;
}

export { compile };
