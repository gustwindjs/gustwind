import type { CharacterGenerator } from "../../types.ts";

type Parse<ExpressionReturnType> = (
  { getCharacter, parse }: {
    getCharacter: CharacterGenerator;
    parse?: Parse<ExpressionReturnType>;
  },
) => {
  match: string | boolean;
  value: string | ExpressionReturnType;
};

export type { Parse };
