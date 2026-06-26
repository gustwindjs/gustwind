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

async function applyUtility<
  U extends Utility,
  US extends Utilities,
  C extends Context,
>(
  value: U | unknown,
  utilities: US,
  context: C,
): Promise<any> {
  assertUtilities(utilities);

  if (!value) {
    return;
  }

  if (!isUtilityCall(value)) {
    return await resolveNonUtilityValue(value, utilities, context);
  }

  const foundUtility = getUtility(utilities, value);
  const parameters = await resolveUtilityParameters(value, utilities, context);

  try {
    return foundUtility.apply(
      context,
      unwrapUtilityArguments(parameters, value.utility),
    );
  } catch (_error) {
    console.error("Failed to apply", foundUtility, parameters);
  }
}

export { applyUtility };

async function resolveNonUtilityValue(
  value: unknown,
  utilities: Utilities,
  context: Context,
) {
  if (!shouldResolveObject(value)) {
    return value;
  }

  return Object.fromEntries(
    await Promise.all(
      Object.entries(value as Record<string, unknown>).map(async ([k, v]) => [
        k,
        await applyUtility(v, utilities, context),
      ]),
    ),
  );
}

function resolveUtilityParameters(
  value: Utility,
  utilities: Utilities,
  context: Context,
) {
  return Promise.all(
    getUtilityParameters(value).map((parameter) =>
      isNestedUtilityParameter(parameter)
        ? applyUtility(parameter, utilities, context)
        : parameter
    ),
  );
}
