import type { CharacterGenerator } from "../../types.ts";

const LIMIT = 100000;

// Parses the content within \item[<key>] <value>
function parseDefinitionItem(
  getCharacter: CharacterGenerator,
): { title: string; description: string } {
  let stringBuffer = "";

  for (let i = 0; i < LIMIT; i++) {
    const c = getCharacter.next();

    if (c === null) {
      break;
    }

    if (c === "\\") {
      getCharacter.previous();

      return { title: "foo", description: "bar" };
    } else {
      stringBuffer += c;
    }
  }

  throw new Error("No matching expression was found");
}

export { parseDefinitionItem };
