import type { Context } from "../breezewind/types.ts";

// init({ routes }: { routes: Routes })
function init() {
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

  return { _onRenderEnd, _onRenderStart };
}

export { init };
