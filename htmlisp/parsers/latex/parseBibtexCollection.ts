import { type BibtexCollection, parseBibtex } from "./parsers/bibtex.ts";
import { runParsers } from "./parsers/runParsers.ts";
import { characterGenerator } from "../characterGenerator.ts";

const LIMIT = 100000;

function parseBibtexCollection(input: string): BibtexCollection[] {
  const getCharacter = characterGenerator(input);
  const ret: BibtexCollection[] = [];

  for (let i = 0; i < LIMIT; i++) {
    const parseResult = runParsers<BibtexCollection>(
      getCharacter,
      // @ts-expect-error This is fine for now. TODO: Fix runParsers type
      [parseBibtex],
    );

    if (parseResult?.match) {
      // @ts-expect-error This is fine. Likely runParsers return type can be simplified
      ret.push(parseResult.value);
    }

    const c = getCharacter.next();

    if (c === null) {
      break;
    }
  }

  return ret;
}

export { parseBibtexCollection };
