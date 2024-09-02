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
  singleExpressions: Record<string, SingleParser<Element>>,
  contentExpressions: Record<string, SingleParser<Element>>,
  doubleExpressions: Record<string, DoubleParser<Element>>,
  blockExpressions: Record<string, BlockParser<Element, Element>>,
): Element[] {
  const getCharacter = characterGenerator(input);
  const singleParsers = getParseSingle(singleExpressions);
  const doubleParsers = getParseDouble(doubleExpressions);
  const blockParsers = getParseBlock(blockExpressions);
  const contentParsers = getParseSingle(contentExpressions);
  const allParsers = [
    singleParsers,
    doubleParsers,
    blockParsers,
    getParseContent<Element>(
      (children) => ({
        type: "p",
        attributes: {},
        children,
      }),
      [singleParsers, doubleParsers, contentParsers],
    ),
  ];
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
