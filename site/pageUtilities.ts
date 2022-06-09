import markdown from "./transforms/markdown.ts";
import { tw } from "../client-deps.ts";

function testUtility(input: string) {
  return input;
}

export { markdown, testUtility, tw };
