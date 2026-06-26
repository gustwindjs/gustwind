import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tailwindStylesheetPath = require.resolve("tailwindcss/index.css");

function normalizeTailwindSource(source: string) {
  let hasTailwindImport = false;

  const withResolvedImports = source.replace(
    /@import\s+["']tailwindcss["'];/g,
    () => {
      hasTailwindImport = true;

      return `@import "${tailwindStylesheetPath}";`;
    },
  );

  return withResolvedImports.replace(
    /^\s*@tailwind\s+(?:base|components|utilities)\s*;\s*$/gm,
    () => {
      if (hasTailwindImport) {
        return "";
      }

      hasTailwindImport = true;

      return `@import "${tailwindStylesheetPath}";`;
    },
  );
}

export { normalizeTailwindSource };
