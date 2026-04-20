import { cp, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { prepublish } from "../version.ts";

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const rootPackage = JSON.parse(
  await readFile(path.join(rootDirectory, "package.json"), "utf8"),
);
const version = process.argv[2] ?? rootPackage.version;

if (!version) {
  console.error("Usage: node ./scripts/release-local.mjs [version-from-package.json]");
  process.exit(1);
}

if (!isValidVersion(version)) {
  console.error(`Invalid version "${version}". Use an npm-style semver version.`);
  process.exit(1);
}

if (!await prepublish(version)) {
  console.error(`Prepublish checks rejected version "${version}".`);
  process.exit(1);
}

const releaseArtifactsDirectory = path.join(rootDirectory, ".release", version);

await rm(releaseArtifactsDirectory, { recursive: true, force: true });
await mkdir(releaseArtifactsDirectory, { recursive: true });

await runNodeScript("./gustwind-node/cli.ts", [
  "--build",
  "--output",
  "./build",
  "--plugins",
  "./plugins.release.json",
]);

await runNodeScript("./scripts/build-npm-package.mjs", ["gustwind", version]);
await runNodeScript("./scripts/build-npm-package.mjs", ["htmlisp", version]);

await runNpmPack(path.join(rootDirectory, "gustwind-node", "npm"));
await runNpmPack(path.join(rootDirectory, "htmlisp", "npm"));

await cp(
  path.join(rootDirectory, "gustwind-node", "npm", `gustwind-${version}.tgz`),
  path.join(releaseArtifactsDirectory, `gustwind-${version}.tgz`),
);
await cp(
  path.join(rootDirectory, "htmlisp", "npm", `htmlisp-${version}.tgz`),
  path.join(releaseArtifactsDirectory, `htmlisp-${version}.tgz`),
);

console.log([
  `Release artifacts built for ${version}.`,
  `Site build: ${path.join(rootDirectory, "build")}`,
  `gustwind package: ${path.join(rootDirectory, "gustwind-node", "npm")}`,
  `htmlisp package: ${path.join(rootDirectory, "htmlisp", "npm")}`,
  `Packed tarballs: ${releaseArtifactsDirectory}`,
].join("\n"));

function isValidVersion(input) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/.test(input);
}

async function runNodeScript(scriptPath, args) {
  await runCommand(process.execPath, [scriptPath, ...args], {
    cwd: rootDirectory,
  });
}

async function runNpmPack(cwd) {
  const cacheDirectory = path.join(cwd, ".npm");
  await mkdir(cacheDirectory, { recursive: true });

  await runCommand("npm", ["pack", "--json"], {
    cwd,
    env: {
      ...process.env,
      HOME: cwd,
      npm_config_cache: cacheDirectory,
    },
  });
}

async function runCommand(command, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? rootDirectory,
      env: options.env ?? process.env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}
