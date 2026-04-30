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

      // @ts-expect-error There's some type confusion here
      const fields = parseResult.value.fields;
      // @ts-expect-error There's some type confusion here
      parseResult.value.fields = normalizeBibtexFields(fields);

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

function normalizeBibtexFields(fields: Record<string, string> = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      decodeLatexAccents(value),
    ]),
  );
}

function decodeLatexAccents(value: string) {
  return value
    .replace(
      /\{\\?"([A-Za-z])\}/g,
      (_, letter: string) => decodeLatexAccent('"', letter),
    )
    .replace(
      /\\?"([A-Za-z])/g,
      (_, letter: string) => decodeLatexAccent('"', letter),
    )
    .replace(
      /\{\\?'([A-Za-z])\}/g,
      (_, letter: string) => decodeLatexAccent("'", letter),
    )
    .replace(
      /\\'([A-Za-z])/g,
      (_, letter: string) => decodeLatexAccent("'", letter),
    )
    .replace(
      /\{\\?`([A-Za-z])\}/g,
      (_, letter: string) => decodeLatexAccent("`", letter),
    )
    .replace(
      /\\`([A-Za-z])/g,
      (_, letter: string) => decodeLatexAccent("`", letter),
    )
    .replace(
      /\{\\?\^([A-Za-z])\}/g,
      (_, letter: string) => decodeLatexAccent("^", letter),
    )
    .replace(
      /\\\^([A-Za-z])/g,
      (_, letter: string) => decodeLatexAccent("^", letter),
    )
    .replace(
      /\{\\?~([A-Za-z])\}/g,
      (_, letter: string) => decodeLatexAccent("~", letter),
    )
    .replace(
      /\\~([A-Za-z])/g,
      (_, letter: string) => decodeLatexAccent("~", letter),
    )
    .replace(
      /\{\\c\{([A-Za-z])\}\}/g,
      (_, letter: string) => decodeLatexAccent("c", letter),
    )
    .replace(
      /\\c\{([A-Za-z])\}/g,
      (_, letter: string) => decodeLatexAccent("c", letter),
    );
}

function decodeLatexAccent(accent: string, letter: string) {
  const accents: Record<string, Record<string, string>> = {
    '"': {
      A: "Ä",
      E: "Ë",
      I: "Ï",
      O: "Ö",
      U: "Ü",
      Y: "Ÿ",
      a: "ä",
      e: "ë",
      i: "ï",
      o: "ö",
      u: "ü",
      y: "ÿ",
    },
    "'": {
      A: "Á",
      E: "É",
      I: "Í",
      O: "Ó",
      U: "Ú",
      Y: "Ý",
      a: "á",
      e: "é",
      i: "í",
      o: "ó",
      u: "ú",
      y: "ý",
    },
    "`": {
      A: "À",
      E: "È",
      I: "Ì",
      O: "Ò",
      U: "Ù",
      a: "à",
      e: "è",
      i: "ì",
      o: "ò",
      u: "ù",
    },
    "^": {
      A: "Â",
      E: "Ê",
      I: "Î",
      O: "Ô",
      U: "Û",
      a: "â",
      e: "ê",
      i: "î",
      o: "ô",
      u: "û",
    },
    "~": {
      A: "Ã",
      N: "Ñ",
      O: "Õ",
      a: "ã",
      n: "ñ",
      o: "õ",
    },
    c: {
      C: "Ç",
      c: "ç",
    },
  };

  return accents[accent]?.[letter] || letter;
}

export { parseBibtexCollection };
