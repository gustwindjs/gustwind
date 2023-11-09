import type { Context } from "../../breezewind/types.ts";

function init() {
  let renderStart: number;

  function _onRenderStart() {
    // This is triggered when page rendering begins.
    // It's a good spot for clearing ids caches (think anchoring)
    // or benchmarking.
    renderStart = performance.now();
  }

  function _onRenderEnd(context: Context) {
    if (context.url) {
      const renderEnd = performance.now();

      console.log(
        `Rendered ${context.url} in ${renderEnd - renderStart} ms.`,
      );
    }
  }

  return { _onRenderEnd, _onRenderStart };
}

export { init };
