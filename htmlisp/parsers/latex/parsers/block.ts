import { getParseDouble } from "./double.ts";
import { getParseSingle } from "./single.ts";
import { parseEmpty } from "./empty.ts";
import { runParsers } from "./runParsers.ts";
import type { CharacterGenerator } from "../../types.ts";

type BlockParser<ExpressionReturnType, ItemReturnValue> = {
  container: (items: (ItemReturnValue)[]) => ExpressionReturnType;
  item: (
    getCharacter: CharacterGenerator,
  ) => ItemReturnValue;
};

const LIMIT = 100000;

// Parses \begin{<type>}...\end{<type>} form
function getParseBlock<ExpressionReturnType, ItemReturnValue>(
  expressions: Record<
    string,
    BlockParser<ExpressionReturnType, ItemReturnValue>
  >,
) {
  return function parseBlock(
    getCharacter: CharacterGenerator,
  ): ExpressionReturnType {
    const beginValue = parseBlockBegin(getCharacter);
    const expression = expressions[beginValue];

    if (!expression) {
      throwNoMatchingExpression();
    }

    const items = collectBlockItems(getCharacter, expression.item);
    const end = parseBlockEnd(
      getCharacter,
    );

    if (beginValue === end.value) {
      return expression.container(items);
    }

    throwNoMatchingExpression();
    // throw new Error(`Expression matching to ${beginValue} was not found`);
  };
}

function parseBlockBegin(getCharacter: CharacterGenerator) {
  const parseResult = runParsers<string>(
    getCharacter,
    [
      getParseDouble({ begin: (value) => value }),
      getParseSingle({ begin: joinString }),
    ],
  );

  if (
    parseResult?.match && "value" in parseResult &&
    typeof parseResult.value === "string"
  ) {
    return parseResult.value;
  }

  throwNoMatchingExpression();
}

function collectBlockItems<ItemReturnValue>(
  getCharacter: CharacterGenerator,
  itemCb: BlockParser<unknown, ItemReturnValue>["item"],
) {
  let items: ItemReturnValue[] = [];

  for (let i = 0; i < LIMIT; i++) {
    if (getCharacter.get() === null) {
      break;
    }

    const collectedItem = collectBlockItem(getCharacter, itemCb);

    if (!collectedItem.match) {
      break;
    }

    items = appendBlockItem(items, collectedItem.value);
  }

  parseEmpty(getCharacter);

  return items;
}

function collectBlockItem<ItemReturnValue>(
  getCharacter: CharacterGenerator,
  itemCb: BlockParser<unknown, ItemReturnValue>["item"],
) {
  const characterIndex = getCharacter.getIndex();

  try {
    return { match: true, value: itemCb(getCharacter) };
  } catch (_error) {
    getCharacter.setIndex(characterIndex);

    return { match: false };
  }
}

function appendBlockItem<ItemReturnValue>(
  items: ItemReturnValue[],
  item: ItemReturnValue | undefined,
) {
  if (!item) {
    return items;
  }

  if (Array.isArray(item)) {
    return item.length ? items.concat([item as ItemReturnValue]) : items;
  }

  return items.concat(item);
}

function parseBlockEnd(getCharacter: CharacterGenerator) {
  return getParseSingle<string>({ end: joinString })(getCharacter);
}

function throwNoMatchingExpression(): never {
  throw new Error("No matching expression was found");
}

function joinString(i: string[]) {
  return i.join("");
}

export { type BlockParser, getParseBlock };
