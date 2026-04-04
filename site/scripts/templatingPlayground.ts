import HighlightJS from "highlight.js/lib/core";
import highlightXML from "highlight.js/lib/languages/xml";
import { htmlispToHTML } from "../../htmlisp/mod.ts";

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
