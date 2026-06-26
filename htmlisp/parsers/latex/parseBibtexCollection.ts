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

    const parseValue = getBibtexParseValue(parseResult);

    if (parseValue) {
      const value = normalizeBibtexEntry(parseValue);
      ret[value.id] = value;
    }

    const c = getCharacter.next();

    if (c === null) {
      break;
    }
  }

  return ret;
}

function getBibtexParseValue(parseResult: unknown) {
  if (!hasParseValue(parseResult)) {
    return;
  }

  if (!isBibtexCollection(parseResult.value)) {
    return;
  }

  return parseResult.value;
}

function hasParseValue(
  parseResult: unknown,
): parseResult is { match: unknown; value: unknown } {
  if (
    parseResult === null ||
    typeof parseResult !== "object" ||
    !("match" in parseResult)
  ) {
    return false;
  }

  return Boolean(parseResult.match) &&
    "value" in parseResult;
}

function isBibtexCollection(value: unknown): value is BibtexCollection {
  return Boolean(value) &&
    typeof value === "object" &&
    typeof (value as Partial<BibtexCollection>).id === "string" &&
    typeof (value as Partial<BibtexCollection>).type === "string";
}

function normalizeBibtexEntry(value: BibtexCollection): BibtexCollection {
  return {
    ...value,
    type: value.type.toUpperCase(),
    fields: normalizeBibtexFields(value.fields),
  };
}

function normalizeBibtexFields(fields: Record<string, string> = {}) {
  const normalizedFields = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      decodeLatexAccents(value),
    ]),
  );

  return stripTitleBraces(normalizedFields);
}

function stripTitleBraces(fields: Record<string, string>) {
  if (!fields.title) {
    return fields;
  }

  return {
    ...fields,
    title: fields.title.replaceAll("{", "").replaceAll("}", ""),
  };
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
