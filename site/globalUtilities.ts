import { urlJoin } from "../utilities/urlJoin.ts";

function init() {
  // Globally available utilities should be exposed here
  return { urlJoin };
}

export { init };
