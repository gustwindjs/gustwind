/// <reference lib="dom" />
import JSONEditor from "jsoneditor";

console.log("Hello from the playground");

// TODO: Write data to some data attribute and load it from there initially
function createPlaygroundEditor(
  elementSelector: string,
  data: string,
) {
  const editor = new JSONEditor(document.getElementById(elementSelector), {
    onChangeJSON(data: string) {
      // TODO: Re-render page contents in-browser now
      console.log("json changed", data);
    },
  });

  editor.set(data);
}

declare global {
  interface Window {
    createPlaygroundEditor: typeof createPlaygroundEditor;
  }
}

window.createPlaygroundEditor = createPlaygroundEditor;
