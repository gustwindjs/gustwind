type Attributes = Record<string, string | null>;

type CharacterGenerator = {
  get: (offset?: number) => string | null;
  next: () => string | null;
  previous: () => string | null;
};
type Element = {
  type: string;
  attributes?: Attributes;
  children: (string | Element)[];
  closesWith?: string | null;
};

export type { Attributes, CharacterGenerator, Element };
