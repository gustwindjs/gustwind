/// <reference lib="dom" />
/// <reference path="./_pageEditor.ts" />
import { twind, twindShim } from "../browserDeps.ts";
import { sharedTwindSetup } from "../src/sharedTwindSetup.ts";
import { importScript } from "../utils/importScript.ts";

twindShim.setup({
  target: document.body,
  ...sharedTwindSetup("development"),
});

function init() {
  const toggleButton = document.createElement("button");
  toggleButton.className = twind.tw(
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

init();
