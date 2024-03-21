function asGenerator(s: string) {
  return function* getCharacter() {
    for (let i = 0; i < s.length; i++) {
      yield s[i];
    }
  };
}

export { asGenerator };
