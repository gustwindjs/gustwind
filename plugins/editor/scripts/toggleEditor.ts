/// <reference lib="dom" />
import type { Tw } from "./twindRuntime.ts";

if (!("Deno" in globalThis)) {
  import("./twindRuntime.ts").then((m) => {
    m.registerListener(init);
  });
}

function init(tw: Tw) {
  console.log("initializing editor");

  let loadedAlready = false;
  const toggleButton = document.createElement("button");
  toggleButton.className = tw(
    "fixed right-4 bottom-4 whitespace-nowrap text-lg",
  );
  toggleButton.innerText = "🐳💨";
  toggleButton.onclick = async () => {
    const m = await import("./pageEditor.ts");

    if (loadedAlready) {
      m.toggleEditorVisibility();
    } else {
      loadedAlready = true;

      m.createEditor();
    }
  };

  document.body.appendChild(toggleButton);
}
