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
    const [tw, globalUtilities, componentUtilities] = await Promise.all([
      import("https://esm.sh/@twind/core@1.1.1"),
      // This is an external!
      // TODO: Figure out how to mute Deno linter here
      import("/styleSetup.js"),
      import("/globalUtilities.js"),
      import("/componentUtilities.js"),
    ]).then(
      (
        [
          { install, tw },
          styleSetupModule,
          globalUtilitiesModule,
          componentUtilitiesModule,
        ],
      ) => {
        const styleSetup = styleSetupModule.default;

        // TODO: What to pass for routes here?
        const globalUtilities = globalUtilitiesModule.init({});
        const componentUtilities = componentUtilitiesModule.init({});

        console.log("loaded custom twind setup", styleSetup);
        console.log("loaded global utilities", globalUtilities);
        console.log("loaded component utilities", componentUtilities);

        // TODO: Figure out why enabling hash breaks markdown transform styling
        install({ ...styleSetup, hash: false });

        return [tw, globalUtilities, componentUtilities];
      },
    ).catch((err) => console.error(err));

    // This is an external!
    // TODO: Figure out how to mute Deno linter here
    const m = await import("/pageEditor.js");

    if (loadedAlready) {
      m.toggleEditorVisibility();
    } else {
      loadedAlready = true;

      m.createEditor(tw, globalUtilities, componentUtilities);
    }
  };

  document.body.appendChild(toggleButton);
}
