import md from "./transforms/markdown.ts";
import { tw as twind } from "../client-deps.ts";
import type { Context } from "../types.ts";

function dateToISO(_: Context, date: string) {
  return (new Date(date)).toISOString();
}

function markdown(_: Context, input: string) {
  return md(input).content;
}

function testUtility(_: Context, input: string) {
  return input;
}

function tw(_: Context, input: string) {
  return twind(input);
}

let renderStart: number;

function _onRenderStart(_: Context) {
  // This is triggered when page rendering begins.
  // It's a good spot for clearing ids caches (think anchoring)
  // or benchmarking.
  renderStart = performance.now();
}

function _onRenderEnd(context: Context) {
  const renderEnd = performance.now();

  console.log(
    `Rendered ${context.pagePath} in ${renderEnd - renderStart} ms.`,
  );
}

export { _onRenderEnd, _onRenderStart, dateToISO, markdown, testUtility, tw };
