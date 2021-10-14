function getModes() {
  return Deno.readTextFile("./documentation/modes.md");
}

export default getModes;
