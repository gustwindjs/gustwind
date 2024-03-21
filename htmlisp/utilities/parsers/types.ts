type Attributes = Record<string, string | null>;
type CharacterGenerator = {
  next: () => string | null;
  previous: () => string | null;
};

export type { Attributes, CharacterGenerator };
