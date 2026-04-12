import "@tailwindcss/browser";
import HighlightJS from "highlight.js/lib/core";
import highlightXML from "highlight.js/lib/languages/xml";
import { htmlispToHTML } from "../../htmlisp/mod.ts";

HighlightJS.registerLanguage("html", highlightXML);

function enableTailwindPlayground() {
  if (document.querySelector("[data-tailwind-playground]")) {
    return;
  }

  const style = document.createElement("style");

  style.type = "text/tailwindcss";
  style.dataset.tailwindPlayground = "true";
  document.head.append(style);
}

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

if (typeof window !== "undefined") {
  console.log("Hello from the templating playground");

  enableTailwindPlayground();
  window.compileHTML = compileHTML;
  window.highlight = highlight;
}

export { compileHTML };
