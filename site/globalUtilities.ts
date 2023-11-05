import { urlJoin } from "https://deno.land/x/url_join@1.0.0/mod.ts";

// init({ routes }: { routes: Routes })
function init() {
  // Globally available utilities should be exposed here
  return { urlJoin };
}

export { init };
