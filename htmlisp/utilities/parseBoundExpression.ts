import type { Utility } from "../../types.ts";
import { parseExpression } from "./parseExpression.ts";

const SHORTHAND_EXPRESSION = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/;

function parseBoundExpression(input: string): Utility | undefined {
  const trimmed = input.trim();

  if (!trimmed) {
    return;
  }

  if (trimmed.startsWith("(")) {
    return parseExpression(trimmed);
  }

  if (SHORTHAND_EXPRESSION.test(trimmed)) {
    return {
      utility: "resolve",
      parameters: [trimmed],
    };
  }

  return parseExpression(trimmed);
}

export { parseBoundExpression };
