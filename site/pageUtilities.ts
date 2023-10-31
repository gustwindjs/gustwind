import md from "./transforms/markdown.ts";
import { tw as twind } from "https://esm.sh/@twind/core@1.1.1";
import type { Context } from "../breezewind/types.ts";
import type { Routes } from "../types.ts";

function init({ routes }: { routes: Routes }) {
  function dateToISO(date: string) {
    return (new Date(date)).toISOString();
  }

  async function processMarkdown(input: string) {
    return (await md(input)).content;
  }

  function testUtility(input: string) {
    return input;
  }

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

    throw new Error(`Failed to find matching url for "${url}"`);
  }

  let renderStart: number;

  function _onRenderStart() {
    // This is triggered when page rendering begins.
    // It's a good spot for clearing ids caches (think anchoring)
    // or benchmarking.
    renderStart = performance.now();
  }

  function _onRenderEnd(context: Context) {
    if (context.pagePath) {
      const renderEnd = performance.now();

      console.log(
        `Rendered ${context.pagePath} in ${renderEnd - renderStart} ms.`,
      );
    }
  }

  return {
    _onRenderEnd,
    _onRenderStart,
    dateToISO,
    processMarkdown,
    testUtility,
    trim,
    tw: twind,
    validateUrl,
  };
}

export { init };
