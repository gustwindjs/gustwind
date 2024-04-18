import { urlJoin } from "https://bundle.deno.dev/https://deno.land/x/url_join@1.0.0/mod.ts";

function init() {
  // Globally available utilities should be exposed here
  return { urlJoin };
}

export { init };
