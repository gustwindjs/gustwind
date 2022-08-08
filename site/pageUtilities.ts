import md from "./transforms/markdown.ts";
import { tw as twind } from "../client-deps.ts";

function dateToISO(_: unknown, date: string) {
  return (new Date(date)).toISOString();
}

function markdown(_: unknown, input: string) {
  return md(input).content;
}

function testUtility(_: unknown, input: string) {
  return input;
}

function tw(_: unknown, input: string) {
  return twind(input);
}

export { dateToISO, markdown, testUtility, tw };
