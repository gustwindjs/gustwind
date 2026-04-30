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

const LIMIT = 100000;
type LatexNode = Element | string;

function parseLatex(
  input: string,
  parser: {
    singles?: Record<string, SingleParser<LatexNode>>;
    doubles?: Record<string, DoubleParser<Element>>;
    blocks?: Record<string, BlockParser<Element, string>>;
    lists?: Record<string, BlockParser<Element, Element>>;
  },
): LatexNode[] {
  input = stripLatexComments(input);

  const getCharacter = characterGenerator(input);
  const singleParsers = parser.singles && getParseSingle(parser.singles);
  const doubleParsers = parser.doubles && getParseDouble(parser.doubles);
  const blockParsers = parser.blocks && getParseBlock(parser.blocks);
  const listParsers = parser.lists && getParseBlock(parser.lists);
  const allParsers = [
    singleParsers,
    doubleParsers,
    blockParsers,
    listParsers,
    getParseContent<LatexNode>(
      (children) => {
        children = children.filter((child) => child !== "");

        if (!children.length) {
          return;
        }

        return {
          type: "p",
          attributes: {},
          children,
        };
      },
      // @ts-expect-error This is fine for now as it will be fixed in a later TS most likely.
      [singleParsers, doubleParsers].filter(Boolean),
    ),
  ].filter(Boolean);
  const ret: LatexNode[] = [];
  let matchCounts: MatchCounts = {};
  let hasParagraphBreak = false;

  for (let i = 0; i < LIMIT; i++) {
    const parseResult = runParsers<LatexNode>(
      getCharacter,
      // @ts-expect-error This is fine for now. TODO: Fix runParsers type
      allParsers,
      matchCounts,
    ) as
      | { match: string | boolean; value?: LatexNode; matchCounts?: MatchCounts }
      | undefined;

    if (parseResult?.match) {
      if ("matchCounts" in parseResult && parseResult.matchCounts) {
        matchCounts = parseResult.matchCounts;
      }

      const value = parseResult.value;

      if (
        typeof value !== "string" && value?.type === "p" && !hasParagraphBreak
      ) {
        const leadingInlineNodes: Element[] = [];

        while (isInlineLatexNode(ret.at(-1))) {
          leadingInlineNodes.unshift(ret.pop() as Element);
        }

        if (leadingInlineNodes.length) {
          value.children = [...leadingInlineNodes, ...value.children];
        }
      }

      if (value) {
        ret.push(value);
      }
      hasParagraphBreak = false;
    }

    if (!parseResult?.match) {
      const c = getCharacter.next();

      if (c === null) {
        break;
      }

      if (c === "\n" && getCharacter.get() === "\n") {
        hasParagraphBreak = true;
      }
    }
  }

  normalizeLatexInlineCommands(ret, parser);

  return ret;
}

function isInlineLatexNode(node: unknown): node is Element {
  return !!node && typeof node === "object" && "type" in node &&
    ["a", "code", "em", "span", "strong", "sup"].includes(
      (node as Element).type,
    );
}

function normalizeLatexInlineCommands(
  children: LatexNode[],
  parser: Parameters<typeof parseLatex>[1],
) {
  for (const child of children) {
    if (typeof child !== "string") {
      if (isRawTextNode(child)) {
        continue;
      }

      child.children = normalizeLatexInlineChildren(
        child.children || [],
        parser,
      );
    }
  }
}

function normalizeLatexInlineChildren(
  children: LatexNode[],
  parser: Parameters<typeof parseLatex>[1],
) {
  const inlineCommandPattern = getInlineCommandPattern(parser);

  return children.flatMap((child) => {
    if (typeof child !== "string") {
      if (!isRawTextNode(child)) {
        child.children = normalizeLatexInlineChildren(
          child.children || [],
          parser,
        );
      }

      return [child];
    }

    if (!inlineCommandPattern?.test(child)) {
      return [child];
    }

    return parseLatex(child, parser).flatMap((node) =>
      typeof node !== "string" && node.type === "p" ? node.children : [node]
    );
  });
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
    if (!line.trim()) {
      skipCommentParagraph = false;
      ret.push(line);
      continue;
    }

    if (skipCommentParagraph || line.trimStart().startsWith("%")) {
      skipCommentParagraph = true;
      ret.push("");
      continue;
    }

    ret.push(stripLatexLineComment(line));
  }

  return ret.join("\n");
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
