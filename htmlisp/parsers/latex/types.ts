import type { CharacterGenerator } from "../types.ts";
import type { Element } from "../../types.ts";

type Parser = (getCharacter: CharacterGenerator) => Element | string;

export type { Parser };
