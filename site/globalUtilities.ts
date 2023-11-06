import { urlJoin } from "../utilities/urlJoin.ts";

// init({ routes }: { routes: Routes })
function init() {
  // Globally available utilities should be exposed here
  return { urlJoin };
}

export { init };
