/// <reference lib="dom" />
import JSONEditor from "jsoneditor";

console.log("Hello from the playground");

function createPlaygroundEditor(
  elementSelector: string,
  dataSelector: string,
) {
  const editor = new JSONEditor(document.getElementById(elementSelector), {
    onChangeJSON(data: string) {
      // TODO: Re-render page contents in-browser now
      console.log("json changed", data);
    },
  });

  const dataElement = document.getElementById(dataSelector);

  dataElement &&
    editor.set(JSON.parse(decodeURIComponent(dataElement.dataset.page || "")));
}

declare global {
  interface Window {
    createPlaygroundEditor: typeof createPlaygroundEditor;
  }
}

window.createPlaygroundEditor = createPlaygroundEditor;
