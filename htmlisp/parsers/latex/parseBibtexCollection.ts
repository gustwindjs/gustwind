import { type BibtexCollection, parseBibtex } from "./parsers/bibtex.ts";
import { runParsers } from "./parsers/runParsers.ts";
import { characterGenerator } from "../characterGenerator.ts";

const LIMIT = 100000;

function parseBibtexCollection(
  input: string,
): Record<string, BibtexCollection> {
  const getCharacter = characterGenerator(input);
  const ret: Record<string, BibtexCollection> = {};

  for (let i = 0; i < LIMIT; i++) {
    const parseResult = runParsers<BibtexCollection>(
      getCharacter,
      // @ts-expect-error This is fine for now. TODO: Fix runParsers type
      [parseBibtex],
    );

    if (parseResult?.match) {
      // Force type to be in uppercase always
      // @ts-expect-error There's some type confusion here
      if (parseResult.value?.type) {
        // @ts-expect-error There's some type confusion here
        parseResult.value.type = parseResult.value.type.toUpperCase();
      }

      // Convert umlauts in names. This probably needs a more generic lookup/solution
      // @ts-expect-error There's some type confusion here
      if (parseResult.value?.fields?.author) {
        // @ts-expect-error There's some type confusion here
        parseResult.value.fields.author = parseResult.value.fields.author
          .replaceAll('{"a}', "ä")
          .replaceAll('{"o}', "ö")
          .replaceAll('{"u}', "ü");
      }

      // Remove title braces
      // @ts-expect-error There's some type confusion here
      if (parseResult.value?.fields?.title) {
        // @ts-expect-error There's some type confusion here
        parseResult.value.fields.title = parseResult.value.fields.title
          .replaceAll("{", "")
          .replaceAll("}", "");
      }

      // @ts-expect-error This is fine. Likely runParsers return type can be simplified
      ret[parseResult.value.id] = parseResult.value;
    }

    const c = getCharacter.next();

    if (c === null) {
      break;
    }
  }

  return ret;
}

export { parseBibtexCollection };
