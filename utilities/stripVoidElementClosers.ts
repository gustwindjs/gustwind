const VOID_ELEMENT_CLOSER_PATTERN =
  /<\/(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\s*>/gi;

function stripVoidElementClosers(markup: string) {
  return markup.replace(VOID_ELEMENT_CLOSER_PATTERN, "");
}

export { stripVoidElementClosers };
