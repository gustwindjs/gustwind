function getConcepts() {
  return Deno.readTextFile("./documentation/concepts.md");
}

export default getConcepts;
