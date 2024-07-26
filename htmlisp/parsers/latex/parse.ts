import { getParseSingle } from "./parsers/single.ts";
import { getParseDouble } from "./parsers/double.ts";
import { getParseBlock } from "./parsers/block.ts";
import { getParseContent } from "./parsers/content.ts";
import { blocks, doubles, singles } from "./expressions.ts";
import { runParsers } from "./parsers/runParsers.ts";
import type { CharacterGenerator } from "../types.ts";

const LIMIT = 100000;

function parse<ExpressionReturnType>(
  getCharacter: CharacterGenerator,
): ExpressionReturnType[] {
  // TODO: Pass parsers here as a parameter as that also solves typing
  const singleParsers = getParseSingle<ExpressionReturnType>(singles);
  const doubleParsers = getParseDouble<ExpressionReturnType>(doubles);
  const parsers = [
    singleParsers,
    doubleParsers,
    getParseBlock<ExpressionReturnType>(blocks),
    getParseContent<ExpressionReturnType>((children) => ({
      type: "p",
      attributes: {},
      children,
    }), [singleParsers, doubleParsers]),
  ];

  const ret = [];

  for (let i = 0; i < LIMIT; i++) {
    const parseResult = runParsers<ExpressionReturnType>(getCharacter, parsers);

    if (parseResult) {
      ret.push(parseResult);
    }

    const c = getCharacter.next();

    if (c === null) {
      break;
    }
  }

  // @ts-ignore Ignore for now - most likely there's a type mismatch
  return ret;
}

export { parse };
