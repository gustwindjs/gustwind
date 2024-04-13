import { install } from "https://cdn.skypack.dev/@twind/core@1.1.1?min";
import presetTailwind from "https://esm.sh/@twind/preset-tailwind@1.1.1";
// TODO: Figure out how to make this import browser-compatible - jsdelivr does something different than unpkg here
import HighlightJS from "https://unpkg.com/@highlightjs/cdn-assets@11.9.0/es/core.min.js";
import highlightXML from "https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/es/languages/xml.js";
import { htmlispToHTML } from "../../htmlisp/mod.ts";

install({ presets: [presetTailwind()], hash: false });

HighlightJS.registerLanguage("html", highlightXML);

function highlight(language: string, str: string) {
  return HighlightJS.highlight(str, { language }).value;
}

function compileHTML(htmlInput: string) {
  try {
    return htmlispToHTML({ htmlInput });
  } catch (_error) {
    console.error(_error, htmlInput);

    return "Failed to convert input";
  }
}

declare global {
  interface Window {
    compileHTML: typeof compileHTML;
    highlight: typeof highlight;
  }
}

if (!("Deno" in globalThis)) {
  console.log("Hello from the templating playground");

  window.compileHTML = compileHTML;
  window.highlight = highlight;
}

export { compileHTML };
