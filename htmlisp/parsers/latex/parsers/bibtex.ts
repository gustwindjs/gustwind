import type { CharacterGenerator } from "../../types.ts";

type BibtexCollection = {
  type: string;
  id: string;
  fields?: Record<string, string>;
};

const LIMIT = 100000;

function parseBibtex(getCharacter: CharacterGenerator): BibtexCollection {
  const startIndex = getCharacter.getIndex();
  const header = readBibtexHeader(getCharacter, startIndex);

  return {
    ...header,
    fields: readBibtexFields(getCharacter),
  };
}

function readBibtexHeader(
  getCharacter: CharacterGenerator,
  startIndex: number,
) {
  requireNextCharacter(getCharacter, "@", startIndex);
  const type = readWhile(getCharacter, (c) => /[A-Za-z]/.test(c)).trim();

  skipWhitespace(getCharacter);
  requireNextCharacter(getCharacter, "{", startIndex);
  const id = readUntil(getCharacter, [",", "}"]).trim();

  if (!type) {
    getCharacter.setIndex(startIndex);
    throw new Error("No matching expression was found");
  }

  return { type, id };
}

function requireNextCharacter(
  getCharacter: CharacterGenerator,
  expectedCharacter: string,
  startIndex: number,
) {
  if (getCharacter.next() === expectedCharacter) {
    return;
  }

  getCharacter.setIndex(startIndex);
  throw new Error("No matching expression was found");
}

function readBibtexFields(getCharacter: CharacterGenerator) {
  const fields: Record<string, string> = {};
  let current = getCharacter.get();

  if (current === "}") {
    getCharacter.next();
    return fields;
  }

  while (current !== null) {
    skipWhitespaceAndCommas(getCharacter);
    current = getCharacter.get();

    if (current === "}") {
      getCharacter.next();
      break;
    }

    readBibtexField(getCharacter, fields);
    current = getCharacter.get();
  }

  return fields;
}

function readBibtexField(
  getCharacter: CharacterGenerator,
  fields: Record<string, string>,
) {
  const key = readWhile(getCharacter, (c) => /[A-Za-z0-9_-]/.test(c)).trim();

  skipWhitespace(getCharacter);

  if (!key || getCharacter.next() !== "=") {
    throw new Error("No matching expression was found");
  }

  skipWhitespace(getCharacter);

  fields[key] = readBibtexValue(getCharacter).trim();
}

function readBibtexValue(getCharacter: CharacterGenerator) {
  const first = getCharacter.get();

  if (first === "{") {
    return readBalancedValue(getCharacter);
  }

  if (first === '"') {
    return readQuotedValue(getCharacter);
  }

  return readUntil(getCharacter, [",", "}"]).trim();
}

function readBalancedValue(getCharacter: CharacterGenerator) {
  let depth = 0;
  let value = "";

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      break;
    }

    const next = readBalancedValueCharacter(c, depth, value);

    if (next.done) {
      break;
    }

    depth = next.depth;
    value = next.value;
  }

  return value;
}

function readBalancedValueCharacter(c: string, depth: number, value: string) {
  if (c === "{") {
    return {
      depth: depth + 1,
      done: false,
      value: depth > 0 ? value + c : value,
    };
  }

  if (c === "}") {
    const nextDepth = depth - 1;

    return {
      depth: nextDepth,
      done: nextDepth === 0,
      value: nextDepth === 0 ? value : value + c,
    };
  }

  return {
    depth,
    done: false,
    value: value + c,
  };
}

function readQuotedValue(getCharacter: CharacterGenerator) {
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

function skipWhitespace(getCharacter: CharacterGenerator) {
  readWhile(getCharacter, (c) => /\s/.test(c));
}

function skipWhitespaceAndCommas(getCharacter: CharacterGenerator) {
  readWhile(getCharacter, (c) => /[\s,]/.test(c));
}

function readUntil(getCharacter: CharacterGenerator, endCharacters: string[]) {
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
