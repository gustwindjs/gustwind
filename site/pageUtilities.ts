import md from "./transforms/markdown.ts";
import { tw as twind } from "../client-deps.ts";
import type { Context } from "../breezewind/types.ts";

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

export { dateToISO, markdown, testUtility, tw };
