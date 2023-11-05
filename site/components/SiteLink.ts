import type { Routes } from "../../types.ts";

function init({ routes }: { routes: Routes }) {
  function trim(str: string, char: string) {
    if (!str) {
      throw new Error("No string to trim!");
    }

    // Exception for /
    if (str === char) {
      return str;
    }

    // Adapted from https://www.sitepoint.com/trimming-strings-in-javascript/
    return str.replace(new RegExp("^[" + char + "]+"), "").replace(
      new RegExp("[" + char + "]+$"),
      "",
    );
  }

  function validateUrl(url: string) {
    if (!url) {
      return;
    }

    if (routes[url]) {
      return url === "/" ? "/" : `/${url}/`;
    }

    // TODO: This would be a good spot to check the url doesn't 404
    // To keep this fast, some kind of local, time-based cache would
    // be good to have to avoid hitting the urls all the time.
    if (url.startsWith("http")) {
      return url;
    }

    throw new Error(
      `Failed to find matching url for "${url}" from ${
        Object.keys(routes).join(", ")
      }`,
    );
  }

  return { trim, validateUrl };
}

export { init };
