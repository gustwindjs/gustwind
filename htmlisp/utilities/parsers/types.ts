type Attributes = Record<string, string | null>;
type CharacterGenerator = {
  get: (offset?: number) => string | null;
  next: () => string | null;
  previous: () => string | null;
};

export type { Attributes, CharacterGenerator };
