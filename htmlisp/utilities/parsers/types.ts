type CharacterGenerator = {
  get: (offset?: number) => string | null;
  next: () => string | null;
  previous: () => string | null;
};

export type { CharacterGenerator };
