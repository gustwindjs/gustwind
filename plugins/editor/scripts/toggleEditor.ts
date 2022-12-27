/// <reference lib="dom" />

if (!("Deno" in globalThis)) {
  init();
}

function init() {
  console.log("Initializing editor");

  let loadedAlready = false;
  const toggleButton = document.createElement("button");
  // It's not possible to have a direct dependency on tw as
  // this has to stay as lean as possible. tw will be loaded
  // later if needed.
  toggleButton.style.position = "fixed";
  toggleButton.style.right = "1em";
  toggleButton.style.bottom = "1em";
  toggleButton.innerText = "🐳💨";
  toggleButton.onclick = async () => {
    const tw = await Promise.all([
      import("https://esm.sh/@twind/core@1.1.1"),
      // This is an external!
      // TODO: Figure out how to mute Deno linter here
      import("/twindSetup.js"),
    ]).then(([{ install, tw }, m]) => {
      console.log("loaded custom twind setup", m.default);

      // TODO: Figure out why enabling hash breaks markdown transform styling
      install({ ...m.default, hash: false });

      return tw;
    });

    const m = await import("./pageEditor.ts");

    if (loadedAlready) {
      m.toggleEditorVisibility();
    } else {
      loadedAlready = true;

      m.createEditor(tw);
    }
  };

  document.body.appendChild(toggleButton);
}
