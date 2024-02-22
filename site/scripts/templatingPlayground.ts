import HighlightJS from "https://unpkg.com/@highlightjs/cdn-assets@11.7.0/es/core.min.js";
import highlightXML from "https://unpkg.com/highlight.js@11.7.0/es/languages/xml.js";
import { htmlToBreezewind } from "../../htmlisp/mod.ts";
import { compileBreezewind as compileBZ } from "./breezewindPlayground.ts";

HighlightJS.registerLanguage("html", highlightXML);

function highlight(language: string, str: string) {
  return HighlightJS.highlight(str, { language }).value;
}

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
    highlight: typeof highlight;
  }
}

if (!("Deno" in globalThis)) {
  console.log("Hello from the templating playground");

  window.compileBreezewind = compileBreezewind;
  window.compileHTML = compileHTML;
  window.highlight = highlight;
}

export { compileHTML };
