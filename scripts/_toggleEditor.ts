/// <reference lib="dom" />
/// <reference path="./_pageEditor.ts" />
import { tw } from "https://cdn.skypack.dev/twind@0.16.16?min";
import { setup } from "https://cdn.skypack.dev/twind@0.16.16/shim?min";
import { sharedTwindSetup } from "../src/sharedTwindSetup.ts";

// TODO: Figure out how to load custom twind config here.
// Maybe this has to go through importScript or import()
if (!("Deno" in globalThis)) {
  setup({
    target: document.body,
    ...sharedTwindSetup("development"),
  });

  init();
}

function init() {
  let loadedAlready = false;
  const toggleButton = document.createElement("button");
  toggleButton.className = tw(
    "fixed right-4 bottom-4 whitespace-nowrap text-lg",
  );
  toggleButton.innerText = "🐳💨";
  toggleButton.onclick = async () => {
    const m = await import("./_pageEditor.ts");

    if (loadedAlready) {
      m.toggleEditorVisibility();
    } else {
      loadedAlready = true;

      m.createEditor();
    }
  };

  document.body.appendChild(toggleButton);
}
