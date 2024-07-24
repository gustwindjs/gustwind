type CharacterGenerator = {
  get: (offset?: number) => string | null;
  next: () => string | null;
  previous: () => string | null;
  move: (offset: number) => void;
};

export type { CharacterGenerator };
