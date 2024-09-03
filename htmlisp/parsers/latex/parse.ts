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

function parse(
  input: string,
  parser: {
    singles?: Record<string, SingleParser<Element>>;
    doubles?: Record<string, DoubleParser<Element>>;
    blocks?: Record<string, BlockParser<Element, string>>;
    lists?: Record<string, BlockParser<Element, Element>>;
    contents?: Record<string, SingleParser<Element>>;
  },
): Element[] {
  const getCharacter = characterGenerator(input);
  const singleParsers = parser.singles && getParseSingle(parser.singles);
  const doubleParsers = parser.doubles && getParseDouble(parser.doubles);
  const blockParsers = parser.blocks && getParseBlock(parser.blocks);
  const listParsers = parser.lists && getParseBlock(parser.lists);
  const contentParsers = parser.contents && getParseSingle(parser.contents);
  const allParsers = [
    singleParsers,
    doubleParsers,
    blockParsers,
    listParsers,
    getParseContent<Element>(
      (children) => ({
        type: "p",
        attributes: {},
        children,
      }),
      // @ts-expect-error This is fine for now as it will be fixed in a later TS most likely.
      [singleParsers, doubleParsers, contentParsers].filter(Boolean),
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

  return ret;
}

export { parse };
