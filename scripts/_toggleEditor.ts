/// <reference lib="dom" />
/// <reference path="./_pageEditor.ts" />
import { tw } from "https://cdn.skypack.dev/twind@0.16.16?min";
import { setup } from "https://cdn.skypack.dev/twind@0.16.16/shim?min";
import { sharedTwindSetup } from "../src/sharedTwindSetup.ts";
import { importScript } from "../utils/importScript.ts";

if (!("Deno" in globalThis)) {
  setup({
    target: document.body,
    ...sharedTwindSetup("development"),
  });

  init();
}

function init() {
  const toggleButton = document.createElement("button");
  toggleButton.className = tw(
    "fixed right-4 bottom-4 whitespace-nowrap text-lg",
  );
  toggleButton.innerText = "🐳💨";
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
