import type { CharacterGenerator } from "../../types.ts";

const LIMIT = 100000;

// Parses the content within "Chapter & Purpose & Writing approach \\"
function parseTabularItem(
  getCharacter: CharacterGenerator,
): string[] {
  const ret: string[] = [];
  let stringBuffer = "";

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      return ret;
    }

    if (getCharacter.slice(0, 3) === "\end") {
      throw new Error("No matching expression was found");
    } else if (c === "\\" && getCharacter.get() === "\\") {
      getCharacter.next();

      return ret.concat(stringBuffer.trim());
    } else if (c === "&") {
      ret.push(stringBuffer.trim());

      stringBuffer = "";
    } else if (c !== "\n") {
      stringBuffer += c;
    }
  }

  throw new Error("No matching expression was found");
}

export { parseTabularItem };
