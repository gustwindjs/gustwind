type Attributes = Record<string, string | null>;

type CharacterGenerator = {
  get: (offset?: number) => string | null;
  next: () => string | null;
  previous: () => string | null;
};
type Tag = {
  type: string;
  attributes?: Attributes;
  children: (string | Tag)[];
  closesWith?: string | null;
};

export type { Attributes, CharacterGenerator, Tag };
