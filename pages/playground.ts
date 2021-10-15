/// <reference lib="dom" />

// TODO: Share this with the page editor in a nice way
const pageEditorId = "pageEditor";

let tries = 0;

async function toggleEditor() {
  const mainElement = document.querySelector("main");

  if (!mainElement) {
    console.error("Failed to find body element");

    return;
  }

  if (tries > 5) {
    console.error("Failed to load page editor script");

    return;
  }

  mainElement.dataset.visible = mainElement.dataset.visible === "true"
    ? "false"
    : "true";

  const pageEditorElement = document.getElementById(pageEditorId);

  if (!pageEditorElement) {
    console.error("Failed to find page editor element");

    try {
      await addScript("pageEditor.js");

      toggleEditor();

      tries++;
    } catch (err) {
      console.error(err);
    }

    return;
  }

  if (mainElement.dataset.visible === "true") {
    pageEditorElement.style.visibility = "visible";
  } else {
    pageEditorElement.style.visibility = "hidden";
  }
}

function addScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.setAttribute("src", src);
    script.onload = () => resolve();
    script.onerror = () => reject();

    document.body.appendChild(script);
  });
}

declare global {
  interface Window {
    toggleEditor: typeof toggleEditor;
  }
}

window.toggleEditor = toggleEditor;
