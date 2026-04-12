import { readdir, readFile } from "node:fs/promises";
import * as path from "node:path";
import { parse, type ParserError } from "parse5";

type HtmlValidationIssue = {
  code: string;
  filePath: string;
  startCol: number;
  startLine: number;
};

type HtmlValidationResult = {
  filesValidated: number;
};

const DEFAULT_IGNORED_ERROR_CODES = new Set<string>([
  "missing-doctype",
]);

function validateHtmlDocument(
  { filePath, html }: {
    filePath: string;
    html: string;
  },
) {
  const parseErrors: ParserError[] = [];

  parse(html, {
    onParseError(error) {
      parseErrors.push(error);
    },
    sourceCodeLocationInfo: true,
  });

  const issues = parseErrors
    .filter((error) => !DEFAULT_IGNORED_ERROR_CODES.has(error.code))
    .map((error) => ({
      code: error.code,
      filePath,
      startCol: error.startCol,
      startLine: error.startLine,
    }));

  if (issues.length > 0) {
    throw new Error(formatHtmlValidationIssues(issues));
  }
}

async function validateHtmlDirectory(directoryPath: string): Promise<HtmlValidationResult> {
  const htmlFiles = await collectHtmlFiles(directoryPath);

  for (const filePath of htmlFiles) {
    validateHtmlDocument({
      filePath,
      html: await readFile(filePath, "utf8"),
    });
  }

  return {
    filesValidated: htmlFiles.length,
  };
}

function formatHtmlValidationIssues(issues: HtmlValidationIssue[]) {
  return [
    "HTML validation failed.",
    ...issues.map(({ code, filePath, startLine, startCol }) =>
      `${filePath}:${startLine}:${startCol} ${code}`
    ),
  ].join("\n");
}

async function collectHtmlFiles(directoryPath: string): Promise<string[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      return await collectHtmlFiles(entryPath);
    }

    return entry.name.endsWith(".html") ? [entryPath] : [];
  }));

  return files.flat().sort();
}

export { formatHtmlValidationIssues, validateHtmlDirectory, validateHtmlDocument };
