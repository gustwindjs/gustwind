import type { CharacterGenerator } from "../../types.ts";

type MatchCounts = Record<string, Array<string>>;

type Parse<ExpressionReturnType> = (
  { getCharacter, matchCounts, parse }: {
    getCharacter: CharacterGenerator;
    matchCounts?: MatchCounts;
    parse?: Parse<ExpressionReturnType>;
  },
) => {
  match: string | boolean;
  value: string | ExpressionReturnType;
  matchCounts?: MatchCounts;
};

export type { MatchCounts, Parse };
