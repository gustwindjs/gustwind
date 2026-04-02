import type { Utility } from "../../types.ts";
import type { ForeachBinding } from "../types.ts";
import { parseBoundExpression } from "./parseBoundExpression.ts";

const FOREACH_ALIAS = /^(?<source>.+?)\s+as\s+(?<alias>[A-Za-z_$][\w$]*)$/;

function parseForeachExpression(
  input: string,
): { expression: Utility; alias?: string } | undefined {
  const trimmed = input.trim();

  if (!trimmed) {
    return;
  }

  const match = trimmed.match(FOREACH_ALIAS);
  const source = match?.groups?.source?.trim() || trimmed;
  const alias = match?.groups?.alias;
  const expression = parseBoundExpression(source);

  if (!expression) {
    return;
  }

  return { expression, alias };
}

function isForeachBinding(value: unknown): value is ForeachBinding {
  return !!value &&
    typeof value === "object" &&
    "items" in value &&
    Array.isArray((value as ForeachBinding).items);
}

export { isForeachBinding, parseForeachExpression };
