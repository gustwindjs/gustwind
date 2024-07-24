// This is a rough approximation of a generator based on
// a closure. The implementation is not as generic as
// it has been designed to be used with strings but it's
// good enough for the purposes of this project.
//
// For this use case, null signifies ending of iteration.
// If nulls could occur within the input structure, then
// it would make sense to wrap the return value within
// an object generator style
function characterGenerator(s: string) {
  let i = 0;

  return {
    get(offset = 0) {
      if (s.length > i + offset) {
        return s[i + offset];
      }

      return null;
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
    move(offset: number) {
      i += offset;
    },
  };
}

export { characterGenerator };
