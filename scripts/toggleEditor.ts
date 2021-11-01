/// <reference lib="dom" />
import { setup } from "twind-shim";
import { tw } from "twind";
import { sharedTwindSetup } from "../src/sharedTwindSetup.ts";
import { importScript } from "../src/importScript.ts";

setup({
  target: document.body,
  ...sharedTwindSetup("development"),
});

function init() {
  const toggleButton = document.createElement("button");
  toggleButton.className = tw(
    "fixed right-4 bottom-4 whitespace-nowrap text-lg",
  );
  toggleButton.innerText = "🐳💨";
  toggleButton.onclick = toggleEditor;

  document.body.appendChild(toggleButton);
}

async function toggleEditor() {
  try {
    await importScript("/pageEditor.js");

    // @ts-ignore TODO: Share window type better
    window.createEditor();
  } catch (err) {
    console.error(err);
  }
}

init();
