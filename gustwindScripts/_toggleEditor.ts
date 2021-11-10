// browserDeps.ts
import * as immer from "https://cdn.skypack.dev/immer@9.0.6?min";
import {
  nanoid as nanoid2
} from "https://cdn.skypack.dev/nanoid@3.1.30?min";
import * as twind from "https://cdn.skypack.dev/twind@0.16.16?min";
import * as twindColors from "https://cdn.skypack.dev/twind@0.16.16/colors?min";
import * as twindSheets from "https://cdn.skypack.dev/twind@0.16.16/sheets?min";
import * as twindShim from "https://cdn.skypack.dev/twind@0.16.16/shim?min";
import twindTypography from "https://cdn.skypack.dev/@twind/typography@0.0.2?min";

// src/sharedTwindSetup.ts
var sharedTwindSetup = (mode) => ({
  mode: "silent",
  theme: { colors: twindColors },
  plugins: {
    ...twindTypography()
  }
});

// utils/importScript.ts
var loadedScripts = {};
function importScript(src) {
  return new Promise((resolve, reject) => {
    if (loadedScripts[src]) {
      return resolve("loadedAlready");
    }
    loadedScripts[src] = true;
    const script = document.createElement("script");
    script.setAttribute("type", "module");
    script.setAttribute("src", src);
    script.onload = () => resolve("loaded");
    script.onerror = () => reject();
    document.body.appendChild(script);
  });
}

// scripts/_toggleEditor.ts
if (!("Deno" in globalThis)) {
  twindShim.setup({
    target: document.body,
    ...sharedTwindSetup("development")
  });
  init();
}
function init() {
  const toggleButton = document.createElement("button");
  toggleButton.className = twind.tw("fixed right-4 bottom-4 whitespace-nowrap text-lg");
  toggleButton.innerText = "\u{1F433}\u{1F4A8}";
  toggleButton.onclick = () => {
    importScript("/_pageEditor.js").then((status) => {
      if (status === "loaded") {
        window.createEditor();
      }
      if (status === "loadedAlready") {
        window.toggleEditorVisibility();
      }
    });
  };
  document.body.appendChild(toggleButton);
}
