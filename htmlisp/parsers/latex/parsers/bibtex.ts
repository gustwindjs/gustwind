import type { CharacterGenerator } from "../../types.ts";

type BibtexCollection = {
  type: string;
  id: string;
  fields?: Record<string, string>;
};

const LIMIT = 100000;

function parseBibtex(
  getCharacter: CharacterGenerator,
): BibtexCollection {
  const startIndex = getCharacter.getIndex();

  if (getCharacter.next() !== "@") {
    getCharacter.setIndex(startIndex);
    throw new Error("No matching expression was found");
  }

  const type = readWhile(getCharacter, (c) => /[A-Za-z]/.test(c)).trim();

  skipWhitespace(getCharacter);

  if (getCharacter.next() !== "{") {
    getCharacter.setIndex(startIndex);
    throw new Error("No matching expression was found");
  }

  const id = readUntil(getCharacter, [",", "}"]).trim();

  if (!type) {
    getCharacter.setIndex(startIndex);
    throw new Error("No matching expression was found");
  }

  const fields: Record<string, string> = {};
  let current = getCharacter.get();

  if (current === "}") {
    getCharacter.next();
    return { type, id, fields };
  }

  while (current !== null) {
    skipWhitespaceAndCommas(getCharacter);
    current = getCharacter.get();

    if (current === "}") {
      getCharacter.next();
      break;
    }

    const key = readWhile(getCharacter, (c) => /[A-Za-z0-9_-]/.test(c)).trim();

    skipWhitespace(getCharacter);

    if (!key || getCharacter.next() !== "=") {
      throw new Error("No matching expression was found");
    }

    skipWhitespace(getCharacter);

    fields[key] = readBibtexValue(getCharacter).trim();
    current = getCharacter.get();
  }

  return { type, id, fields };
}

function readBibtexValue(
  getCharacter: CharacterGenerator,
) {
  const first = getCharacter.get();

  if (first === "{") {
    return readBalancedValue(getCharacter);
  }

  if (first === '"') {
    return readQuotedValue(getCharacter);
  }

  return readUntil(getCharacter, [",", "}"]).trim();
}

function readBalancedValue(
  getCharacter: CharacterGenerator,
) {
  let depth = 0;
  let value = "";

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      break;
    }

    if (c === "{") {
      if (depth > 0) {
        value += c;
      }
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) {
        break;
      }
      value += c;
    } else {
      value += c;
    }
  }

  return value;
}

function readQuotedValue(
  getCharacter: CharacterGenerator,
) {
  let value = "";

  getCharacter.next();

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      break;
    }

    if (c === '"') {
      break;
    }

    value += c;
  }

  return value;
}

function skipWhitespace(
  getCharacter: CharacterGenerator,
) {
  readWhile(getCharacter, (c) => /\s/.test(c));
}

function skipWhitespaceAndCommas(
  getCharacter: CharacterGenerator,
) {
  readWhile(getCharacter, (c) => /[\s,]/.test(c));
}

function readUntil(
  getCharacter: CharacterGenerator,
  endCharacters: string[],
) {
  return readWhile(getCharacter, (c) => !endCharacters.includes(c));
}

function readWhile(
  getCharacter: CharacterGenerator,
  predicate: (c: string) => boolean,
) {
  let value = "";

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.get();

    if (c === null || !predicate(c)) {
      break;
    }

    value += getCharacter.next();
  }

  return value;
}

export { type BibtexCollection, parseBibtex };
