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
  const defaultSetup = {
    // https://twind.dev/handbook/configuration.html#mode
    mode: "silent",
    target: document.body,
  };

  // It seems important to defer loading Twind shim as otherwise
  // Twind would try to evaluate too soon.
  //
  // TODO: What should happen if twindSetup is missing?
  Promise.all([
    import("https://cdn.skypack.dev/twind@0.16.16/shim?min"),
    // deno-lint-ignore no-local This is an external
    import("/twindSetup.js"),
  ]).then(([{ setup }, m]) => {
    console.log("loaded custom twind setup", m.default);

    setup({
      ...defaultSetup,
      ...m.default,
    });

    import("https://cdn.skypack.dev/twind@0.16.16?min").then(({ tw }) => {
      globalTw = tw;
      setupComplete = true;
      listeners.forEach((listener) => listener(tw));
    });
  });
}

function registerListener(cb: Listener) {
  console.log("registering a twind runtime listener");

  if (setupComplete) {
    cb(globalTw);
  } else {
    listeners.push(cb);
  }
}

export { registerListener };
