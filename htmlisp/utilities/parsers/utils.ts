import type { CharacterGenerator } from "./types.ts";

// This is a rough approximation of a generator based on
// a closure. The implementation is not as generic as
// it has been designed to be used with strings but it's
// good enough for the purposes of this project.
//
// For this use case, null signifies ending of iteration.
// If nulls could occur within the input structure, then
// it would make sense to wrap the return value within
// an object generator style
function asGenerator(s: string) {
  return function getCharacter(): CharacterGenerator {
    let i = 0;

    return {
      current() {
        return s[i];
      },
      next() {
        if (i > s.length - 1) {
          return null;
        }

        const ret = s[i];

        i++;

        return ret;
      },
      previous() {
        if (i < 1) {
          return null;
        }

        const ret = s[i];

        i--;

        return ret;
      },
    };
  };
}

export { asGenerator };
