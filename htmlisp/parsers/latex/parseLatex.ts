import { getParseContent } from "./parsers/content.ts";
import { getParseSingle } from "./parsers/single.ts";
import { getParseDouble } from "./parsers/double.ts";
import { getParseBlock } from "./parsers/block.ts";
import { runParsers } from "./parsers/runParsers.ts";
import { characterGenerator } from "../characterGenerator.ts";
import type { Element } from "../../types.ts";
import { type SingleParser } from "./parsers/single.ts";
import { type DoubleParser } from "./parsers/double.ts";
import { type BlockParser } from "./parsers/block.ts";
import type { MatchCounts } from "./parsers/runParsers.ts";
import type { CharacterGenerator } from "../types.ts";

const LIMIT = 100000;
type LatexNode = Element | string;
type LatexParserConfig = {
  singles?: Record<string, SingleParser<LatexNode>>;
  doubles?: Record<string, DoubleParser<Element>>;
  blocks?: Record<string, BlockParser<Element, string>>;
  lists?: Record<string, BlockParser<Element, Element>>;
};
type ParseLatexResult =
  | { match: string | boolean; value?: LatexNode; matchCounts?: MatchCounts }
  | undefined;
type ParseLatexState = {
  ret: LatexNode[];
  matchCounts: MatchCounts;
  hasParagraphBreak: boolean;
};

function parseLatex(input: string, parser: LatexParserConfig): LatexNode[] {
  input = stripLatexComments(input);

  const getCharacter = characterGenerator(input);
  const allParsers = getLatexParsers(parser);
  const state: ParseLatexState = {
    ret: [],
    matchCounts: {},
    hasParagraphBreak: false,
  };

  for (let i = 0; i < LIMIT; i++) {
    if (parseLatexCharacter(state, getCharacter, allParsers)) {
      break;
    }
  }

  normalizeLatexInlineCommands(state.ret, parser);

  return state.ret;
}

function parseLatexCharacter(
  state: ParseLatexState,
  getCharacter: CharacterGenerator,
  allParsers: ReturnType<typeof getLatexParsers>,
) {
  const parseResult = runParsers<LatexNode>(
    getCharacter,
    // @ts-expect-error This is fine for now. TODO: Fix runParsers type
    allParsers,
    state.matchCounts,
  ) as ParseLatexResult;

  if (parseResult?.match) {
    applyParseResult(state, parseResult);

    return false;
  }

  return advanceUnmatchedCharacter(state, getCharacter);
}

function getLatexParsers(parser: LatexParserConfig) {
  const doubleParsers = createDoubleParsers(parser);
  const singleParsers = createSingleParsers(parser, doubleParsers);
  const blockParsers = createBlockParsers(parser);
  const listParsers = createListParsers(parser);

  return [
    singleParsers,
    doubleParsers,
    blockParsers,
    listParsers,
    getParseContent<LatexNode>(
      createLatexParagraph,
      // @ts-expect-error This is fine for now as it will be fixed in a later TS most likely.
      [singleParsers, doubleParsers].filter(Boolean),
    ),
  ].filter(Boolean);
}

function createDoubleParsers(parser: LatexParserConfig) {
  return parser.doubles && getParseDouble(parser.doubles);
}

function createSingleParsers(
  parser: LatexParserConfig,
  doubleParsers: ReturnType<typeof createDoubleParsers>,
) {
  return (
    parser.singles &&
    getParseSingle(
      parser.singles,
      // @ts-expect-error This is fine for now. TODO: Fix runParsers type
      [doubleParsers].filter(Boolean),
    )
  );
}

function createBlockParsers(parser: LatexParserConfig) {
  return parser.blocks && getParseBlock(parser.blocks);
}

function createListParsers(parser: LatexParserConfig) {
  return parser.lists && getParseBlock(parser.lists);
}

function createLatexParagraph(children: LatexNode[]) {
  children = children.filter((child) => child !== "");

  if (!children.length) {
    return;
  }

  return {
    type: "p",
    attributes: {},
    children,
  };
}

function applyParseResult(
  state: ParseLatexState,
  parseResult: NonNullable<ParseLatexResult>,
) {
  if (parseResult.matchCounts) {
    state.matchCounts = parseResult.matchCounts;
  }

  const value = parseResult.value;

  if (shouldMergeLeadingInlineNodes(state, value)) {
    mergeLeadingInlineNodes(state.ret, value);
  }

  pushParseValue(state, value);

  state.hasParagraphBreak = false;
}

function shouldMergeLeadingInlineNodes(
  state: ParseLatexState,
  value: LatexNode | undefined,
): value is Element {
  return (
    typeof value !== "string" && value?.type === "p" && !state.hasParagraphBreak
  );
}

function pushParseValue(state: ParseLatexState, value: LatexNode | undefined) {
  if (value) {
    state.ret.push(value);
  }
}

function mergeLeadingInlineNodes(ret: LatexNode[], value: Element) {
  const leadingInlineNodes: Element[] = [];

  while (isInlineLatexNode(ret.at(-1))) {
    leadingInlineNodes.unshift(ret.pop() as Element);
  }

  if (leadingInlineNodes.length) {
    value.children = [...leadingInlineNodes, ...value.children];
  }
}

function advanceUnmatchedCharacter(
  state: ParseLatexState,
  getCharacter: ReturnType<typeof characterGenerator>,
) {
  const c = getCharacter.next();

  if (c === null) {
    return true;
  }

  if (c === "\n" && getCharacter.get() === "\n") {
    state.hasParagraphBreak = true;
  }

  return false;
}

function isInlineLatexNode(node: unknown): node is Element {
  return (
    !!node &&
    typeof node === "object" &&
    "type" in node &&
    ["a", "code", "em", "span", "strong", "sup"].includes(
      (node as Element).type,
    )
  );
}

function normalizeLatexInlineCommands(
  children: LatexNode[],
  parser: Parameters<typeof parseLatex>[1],
) {
  for (const child of children) {
    normalizeLatexInlineChild(child, parser);
  }
}

function normalizeLatexInlineChild(
  child: LatexNode,
  parser: Parameters<typeof parseLatex>[1],
) {
  if (typeof child === "string" || isRawTextNode(child)) {
    return;
  }

  child.children = normalizeLatexInlineChildren(
    child.children || [],
    parser,
  );
}

function normalizeLatexInlineChildren(
  children: LatexNode[],
  parser: Parameters<typeof parseLatex>[1],
) {
  const inlineCommandPattern = getInlineCommandPattern(parser);

  return children.flatMap((child) =>
    normalizeLatexInlineChildValue(child, parser, inlineCommandPattern)
  );
}

function normalizeLatexInlineChildValue(
  child: LatexNode,
  parser: Parameters<typeof parseLatex>[1],
  inlineCommandPattern: RegExp | undefined,
) {
  if (typeof child !== "string") {
    return normalizeLatexInlineElementChild(child, parser);
  }

  return inlineCommandPattern?.test(child)
    ? parseInlineLatexChild(child, parser)
    : [child];
}

function normalizeLatexInlineElementChild(
  child: Element,
  parser: Parameters<typeof parseLatex>[1],
) {
  if (!isRawTextNode(child)) {
    child.children = normalizeLatexInlineChildren(
      child.children || [],
      parser,
    );
  }

  return [child];
}

function parseInlineLatexChild(
  child: string,
  parser: Parameters<typeof parseLatex>[1],
) {
  return parseLatex(child, parser).flatMap((node) =>
    typeof node !== "string" && node.type === "p" ? node.children : [node],
  );
}

function isRawTextNode(node: Element) {
  return ["code", "pre"].includes(node.type);
}

function stripLatexComments(text: string) {
  return stripLatexLineComments(
    text.replace(/\\begin\{comment\}[\s\S]*?\\end\{comment\}/g, ""),
  );
}

function stripLatexLineComments(text: string) {
  const ret = [];
  let skipCommentParagraph = false;

  for (const line of text.split("\n")) {
    const result = stripLatexLineCommentState(line, skipCommentParagraph);

    skipCommentParagraph = result.skipCommentParagraph;
    ret.push(result.line);
  }

  return ret.join("\n");
}

function stripLatexLineCommentState(
  line: string,
  skipCommentParagraph: boolean,
) {
  if (!line.trim()) {
    return { line, skipCommentParagraph: false };
  }

  if (skipCommentParagraph || line.trimStart().startsWith("%")) {
    return { line: "", skipCommentParagraph: true };
  }

  return {
    line: stripLatexLineComment(line),
    skipCommentParagraph,
  };
}

function stripLatexLineComment(line: string) {
  for (let i = 0; i < line.length; i++) {
    if (line[i] === "%" && !isEscaped(line, i)) {
      return line.slice(0, i).trimEnd();
    }
  }

  return line;
}

function isEscaped(value: string, index: number) {
  let backslashes = 0;

  for (let i = index - 1; i >= 0 && value[i] === "\\"; i--) {
    backslashes++;
  }

  return backslashes % 2 === 1;
}

function getInlineCommandPattern(parser: Parameters<typeof parseLatex>[1]) {
  const commandNames = [
    ...Object.keys(parser.singles || {}),
    ...Object.keys(parser.doubles || {}),
  ];

  if (!commandNames.length) {
    return;
  }

  return new RegExp(
    String.raw`\\(?:${commandNames.map(escapeRegExp).join("|")})(?:\b|{)`,
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export { parseLatex };
