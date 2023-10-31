import md from "./transforms/markdown.ts";
import { tw } from "https://esm.sh/@twind/core@1.1.1";
import type { Context } from "../breezewind/types.ts";

// init({ routes }: { routes: Routes })
function init() {
  function dateToISO(date: string) {
    return (new Date(date)).toISOString();
  }

  async function processMarkdown(input: string) {
    return (await md(input)).content;
  }

  function testUtility(input: string) {
    return input;
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
    tw,
  };
}

export { init };
