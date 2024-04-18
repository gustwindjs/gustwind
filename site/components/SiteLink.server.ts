import type { GlobalUtilities } from "../../types.ts";

const init: GlobalUtilities["init"] = function init({ matchRoute }) {
  async function validateUrl(url: string) {
    if (!url) {
      return;
    }

    const [urlRoot, anchor] = url.split("#");

    if (await matchRoute(urlRoot)) {
      return urlRoot === "/"
        ? url
        : `/${urlRoot}${anchor ? "#" + anchor : "/"}`;
    }

    // TODO: This would be a good spot to check the url doesn't 404
    // To keep this fast, some kind of local, time-based cache would
    // be good to have to avoid hitting the urls all the time.
    if (url.startsWith("http")) {
      return url;
    }

    throw new Error(
      `Failed to find matching url for "${url}"`,
    );
  }

  return { validateUrl };
};

export { init };
