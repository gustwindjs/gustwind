function getReadme() {
  return Deno.readTextFile("./README.md");
}

export default getReadme;
