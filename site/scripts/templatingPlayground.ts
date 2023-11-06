import { htmlToBreezewind } from "../../html-to-breezewind/mod.ts";
import { compileBreezewind as compileBZ } from "./breezewindPlayground.ts";

function compileBreezewind(input: string) {
  return compileBZ(compileHTML(input));
}

function compileHTML(input: string) {
  try {
    return htmlToBreezewind(input);
  } catch (_error) {
    console.error(_error, input);

    return "Failed to convert input";
  }
}

declare global {
  interface Window {
    compileBreezewind: typeof compileBreezewind;
    compileHTML: typeof compileHTML;
  }
}

if (!("Deno" in globalThis)) {
  console.log("Hello from the templating playground");

  window.compileBreezewind = compileBreezewind;
  window.compileHTML = compileHTML;
}

export { compileHTML };
