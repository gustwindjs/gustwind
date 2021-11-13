/// <reference lib="dom" />
import { setup } from "https://cdn.skypack.dev/twind@0.16.16/shim?min";
import { sharedTwindSetup } from "../src/sharedTwindSetup.ts";

type Listener = () => void;

let setupComplete = false;
const listeners: Listener[] = [];

if (!("Deno" in globalThis)) {
  setupTwind();
}

function setupTwind() {
  const sharedSetup = sharedTwindSetup("development");

  setup({
    target: document.body,
    ...sharedSetup,
  });

  // deno-lint-ignore no-local This is an external
  import("/twindSetup.js").then((m) => {
    console.log("loaded custom twind setup", m.default);

    setup({
      target: document.body,
      ...m.default,
    });

    setupComplete = true;
    listeners.forEach((listener) => listener());
  });
}

function registerListener(cb: Listener) {
  console.log("registering a twind runtime listener");

  if (setupComplete) {
    cb();
  } else {
    listeners.push(cb);
  }
}

export { registerListener };
