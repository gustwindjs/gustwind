import * as path from "node:path";
import { validateHtmlDirectory } from "../utilities/htmlValidation.ts";

const targetDirectory = path.resolve(process.argv[2] || "./build");
const { filesValidated } = await validateHtmlDirectory(targetDirectory);

console.log(`Validated ${filesValidated} HTML files in ${targetDirectory}.`);
