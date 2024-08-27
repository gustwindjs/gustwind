// TODO: It would be a good idea to derive this from characterGenerator itself
type CharacterGenerator = {
  get: (offset?: number) => string | null;
  getIndex: () => number;
  setIndex: (value: number) => void;
  next: () => string | null;
  previous: () => string | null;
  slice: (a: number, b: number) => string;
};

export type { CharacterGenerator };
