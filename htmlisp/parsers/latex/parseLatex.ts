import { getParseContent } from "./parsers/content.ts";
import { getParseSingle } from "./parsers/single.ts";
import { getParseDouble } from "./parsers/double.ts";
import { getParseBlock } from "./parsers/block.ts";
import { runParsers } from "./parsers/runParsers.ts";
import { characterGenerator } from "../characterGenerator.ts";
import type { Element } from "../../types.ts";
import { type SingleParser } from "./parsers/single.ts";
import { type DoubleParser } from "./parsers/double.ts";
import { type BlockParser } from "./parsers/block.ts";

const LIMIT = 100000;

function parseLatex(
  input: string,
  parser: {
    singles?: Record<string, SingleParser<Element>>;
    doubles?: Record<string, DoubleParser<Element>>;
    blocks?: Record<string, BlockParser<Element, string>>;
    lists?: Record<string, BlockParser<Element, Element>>;
  },
): Element[] {
  const getCharacter = characterGenerator(input);
  const singleParsers = parser.singles && getParseSingle(parser.singles);
  const doubleParsers = parser.doubles && getParseDouble(parser.doubles);
  const blockParsers = parser.blocks && getParseBlock(parser.blocks);
  const listParsers = parser.lists && getParseBlock(parser.lists);
  const allParsers = [
    singleParsers,
    doubleParsers,
    blockParsers,
    listParsers,
    // TODO: Do [contentParser, [singleParsers, doubleParsers]]
    // to constraint to these specific parsers. The same idea would then
    // work for lists and avoid trouble with blocks since those don't need subparsing
    getParseContent<Element>(
      (children) => ({
        type: "p",
        attributes: {},
        children,
      }),
      // @ts-expect-error This is fine for now as it will be fixed in a later TS most likely.
      [singleParsers, doubleParsers].filter(Boolean),
    ),
  ].filter(Boolean);
  const ret = [];

  for (let i = 0; i < LIMIT; i++) {
    const parseResult = runParsers<Element>(
      getCharacter,
      // @ts-expect-error This is fine for now. TODO: Fix runParsers type
      allParsers,
    );

    if (parseResult?.match) {
      ret.push(parseResult.value);
    }

    const c = getCharacter.next();

    if (c === null) {
      break;
    }
  }

  // @ts-expect-error This is fine for now. TODO: Fix runParsers type
  return ret;
}

export { parseLatex };
