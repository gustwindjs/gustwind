import initUnocssRuntime, { defineConfig } from "@unocss/runtime";
import { presetWind3 } from "@unocss/preset-wind3";
import HighlightJS from "highlight.js/lib/core";
import highlightXML from "highlight.js/lib/languages/xml";
import { htmlispToHTML } from "../../htmlisp/mod.ts";

HighlightJS.registerLanguage("html", highlightXML);

function enableUtilityPlayground() {
  window.__unocss = {
    ...defineConfig({
      presets: [presetWind3()],
    }),
    runtime: {
      rootElement: () =>
        document.querySelector(".unocss-playground-preview") || undefined,
      observer: {
        target: () =>
          document.querySelector(".unocss-playground-preview") || document.body,
        attributeFilter: ["class"],
      },
    },
  };

  return initUnocssRuntime();
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

  void enableUtilityPlayground();
  window.compileHTML = compileHTML;
  window.highlight = highlight;
}

export { compileHTML };
