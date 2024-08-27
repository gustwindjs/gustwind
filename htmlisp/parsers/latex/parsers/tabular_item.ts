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

    if (c === "\\" && getCharacter.get() === "\\") {
      return ret.concat(stringBuffer.trim());
    } else if (c === "&") {
      ret.push(stringBuffer.trim());

      stringBuffer = "";
    } else {
      stringBuffer += c;
    }
  }

  throw new Error("No matching expression was found");
}

export { parseTabularItem };
