function asGenerator(s: string) {
  return function* getCharacter(): Generator<
    string,
    void,
    { previous: boolean } | undefined
  > {
    for (let i = 0; i < s.length; i++) {
      // console.log("get from", i);

      // https://stackoverflow.com/questions/23848113/is-it-possible-to-reset-an-ecmascript-6-generator-to-its-initial-state
      const o = yield s[i];

      if (o?.previous) {
        i--;
      }
    }
  };
}

export { asGenerator };
