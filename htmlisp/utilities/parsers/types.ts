type Attributes = Record<string, string | null>;
type CharacterGenerator = {
  current: (offset?: number) => string | null;
  next: () => string | null;
  previous: () => string | null;
};

export type { Attributes, CharacterGenerator };