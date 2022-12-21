import md from "./transforms/markdown.ts";
import { install, tw as twind } from "https://esm.sh/@twind/core@1.1.1";
import twindSetup from "./twindSetup.ts";
import type { Context } from "../breezewind/types.ts";

// This has to run before tw can work!
install(twindSetup);

function dateToISO(_: Context, date: string) {
  return (new Date(date)).toISOString();
}

async function markdown(_: Context, input: string) {
  return (await md(input)).content;
}

function testUtility(_: Context, input: string) {
  return input;
}

function tw(_: Context, input: string) {
  return twind(input);
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

export { _onRenderEnd, _onRenderStart, dateToISO, markdown, testUtility, tw };
