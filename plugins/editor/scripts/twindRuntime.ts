/// <reference lib="dom" />

export type Tw = (...o: unknown[]) => string;
export type Listener = (tw: Tw) => void;

let setupComplete = false;
let globalTw: Tw;
const listeners: Listener[] = [];

if (!("Deno" in globalThis)) {
  setupTwind();
}

function setupTwind() {
  // It seems important to defer loading Twind shim as otherwise
  // Twind would try to evaluate too soon.
  Promise.all([
    import("https://esm.sh/@twind/core@1.1.1"),
    // This is an external!
    // TODO: Figure out how to mute Deno linter here
    import("/twindSetup.js"),
  ]).then(([{ install, tw }, m]) => {
    console.log("loaded custom twind setup", m.default);

    install(m.default);

    // @ts-expect-error TODO: Figure out how to type this
    globalTw = tw;
    setupComplete = true;
    // @ts-expect-error This is fine.
    listeners.forEach((listener) => listener(tw));
  });
}

function registerListener(cb: Listener) {
  console.log("Registering a twind runtime listener");

  if (setupComplete) {
    cb(globalTw);
  } else {
    listeners.push(cb);
  }
}

export { registerListener };
