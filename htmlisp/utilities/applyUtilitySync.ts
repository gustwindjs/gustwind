import type { Context, Utilities, Utility } from "../../types.ts";
import {
  assertUtilities,
  getUtility,
  getUtilityParameters,
  isNestedUtilityParameter,
  isUtilityCall,
  shouldResolveObject,
  unwrapUtilityArguments,
} from "./applyUtilityShared.ts";

function applyUtilitySync<
  U extends Utility,
  US extends Utilities,
  C extends Context,
>(
  value: U | unknown,
  utilities: US,
  context: C,
): any {
  assertUtilities(utilities);

  if (!value) {
    return;
  }

  if (!isUtilityCall(value)) {
    return resolveNonUtilityValueSync(value, utilities, context);
  }

  const foundUtility = getUtility(utilities, value);
  const parameters = resolveUtilityParametersSync(value, utilities, context);

  return foundUtility.apply(
    context,
    unwrapUtilityArguments(parameters, value.utility),
  );
}

export { applyUtilitySync };

function resolveNonUtilityValueSync(
  value: unknown,
  utilities: Utilities,
  context: Context,
) {
  if (!shouldResolveObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [
      k,
      applyUtilitySync(v, utilities, context),
    ]),
  );
}

function resolveUtilityParametersSync(
  value: Utility,
  utilities: Utilities,
  context: Context,
) {
  return getUtilityParameters(value).map((parameter) =>
    isNestedUtilityParameter(parameter)
      ? applyUtilitySync(parameter, utilities, context)
      : parameter
  );
}
