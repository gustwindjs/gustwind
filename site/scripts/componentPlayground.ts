import { compileBreezewind } from "./breezewindPlayground.ts";

// TODO: Write a better version of compileBreezewind here that's using components properly
// TODO: Also figure out what to do with server.ts dependencies for some of the components
declare global {
  interface Window {
    compileBreezewind: typeof compileBreezewind;
  }
}

if (!("Deno" in globalThis)) {
  console.log("Hello from the component playground");

  window.compileBreezewind = compileBreezewind;
}
