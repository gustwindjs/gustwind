import { runCli } from "./cliMain.ts";

if (import.meta.main) {
  runCli();
}

export { main } from "./cliMain.ts";
