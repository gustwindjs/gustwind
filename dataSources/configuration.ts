function getConfiguration() {
  return Deno.readTextFile("./documentation/configuration.md");
}

export default getConfiguration;
