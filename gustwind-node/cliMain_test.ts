import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import * as path from "node:path";
import process from "node:process";
import test from "node:test";
import { tmpdir } from "node:os";
import { main, runCli } from "./cliMain.ts";

test("main prints version and returns success", async () => {
  const logs = await captureConsoleLog(async () => {
    assert.equal(await main(["--version"]), 0);
  });

  assert.match(logs.join("\n"), /^gustwind@/);
  assert.match(logs.join("\n"), /node@v/);
});

test("main prints usage without an action", async () => {
  const logs = await captureConsoleLog(async () => {
    assert.equal(await main([]), 0);
  });

  assert.match(logs.join("\n"), /gustwind --build/);
  assert.match(logs.join("\n"), /--route-concurrency/);
});

test("main prints usage with help", async () => {
  const logs = await captureConsoleLog(async () => {
    assert.equal(await main(["--help"]), 0);
  });

  assert.match(logs.join("\n"), /Shows the help message/);
});

test("main rejects unknown arguments", async () => {
  await assert.rejects(
    () => main(["--wat"]),
    { message: "Unknown argument --wat" },
  );
});

test("main rejects options missing values", async () => {
  await assert.rejects(
    () => main(["--output"]),
    { message: "Missing output directory" },
  );
  await assert.rejects(
    () => main(["-P"]),
    { message: "Missing plugins definition path" },
  );
});

test("main rejects invalid numeric options", async () => {
  await assert.rejects(
    () => main(["--serve", "--port", "-1"]),
    { message: "Invalid port -1" },
  );
  await assert.rejects(
    () => main(["--benchmark", "--route-concurrency", "0"]),
    { message: "Invalid route concurrency 0" },
  );
  await assert.rejects(
    () => main(["--diagnose-routes", "--diagnostics-top", "many"]),
    { message: "Invalid diagnostics top count many" },
  );
});

test("main validates an input directory", async () => {
  const inputDirectory = await mkdtemp(path.join(tmpdir(), "gustwind-cli-validate-"));

  try {
    await writeFile(
      path.join(inputDirectory, "index.html"),
      "<!doctype html><html><head><title>ok</title></head><body></body></html>",
    );

    const logs = await captureConsoleLog(async () => {
      assert.equal(
        await main(["--validate", "--input", inputDirectory]),
        0,
      );
    });

    assert.match(logs.join("\n"), /Validated 1 HTML files/);
    assert.match(logs.join("\n"), new RegExp(escapeRegExp(inputDirectory)));
  } finally {
    await rm(inputDirectory, { recursive: true, force: true });
  }
});

test("main validates the default build input directory", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "gustwind-cli-default-input-"));
  const previousCwd = process.cwd();

  try {
    await mkdir(path.join(cwd, "build"), { recursive: true });
    await writeFile(
      path.join(cwd, "build", "index.html"),
      "<!doctype html><html><head><title>ok</title></head><body></body></html>",
    );
    process.chdir(cwd);

    const logs = await captureConsoleLog(async () => {
      assert.equal(await main(["--validate"]), 0);
    });

    assert.match(logs.join("\n"), /Validated 1 HTML files/);
    assert.match(logs.join("\n"), /build/);
  } finally {
    process.chdir(previousCwd);
    await rm(cwd, { recursive: true, force: true });
  }
});

test("main rejects additional missing option values", async () => {
  await assert.rejects(
    () => main(["--cache-from"]),
    { message: "Missing cache source" },
  );
  await assert.rejects(
    () => main(["-i"]),
    { message: "Missing input directory" },
  );
  await assert.rejects(
    () => main(["-p"]),
    { message: "Missing port" },
  );
  await assert.rejects(
    () => main(["--route-concurrency"]),
    { message: "Missing route concurrency" },
  );
});

test("runCli uses process arguments and sets success exit code", async () => {
  const previousArgv = process.argv;
  const previousExitCode = process.exitCode;

  try {
    process.argv = ["node", "gustwind", "--version"];
    process.exitCode = undefined;

    const logs = await captureConsoleLog(async () => {
      runCli();
      await waitForMicrotasks();
    });

    assert.equal(process.exitCode, 0);
    assert.equal(logs.length, 1);
    assert.match(logs[0], /^gustwind@/);
  } finally {
    process.argv = previousArgv;
    process.exitCode = previousExitCode;
  }
});

test("runCli reports errors and sets failing exit code", async () => {
  const previousArgv = process.argv;
  const previousError = console.error;
  const previousExitCode = process.exitCode;
  const errors: unknown[] = [];

  try {
    process.argv = ["node", "gustwind", "--wat"];
    process.exitCode = undefined;
    console.error = (error) => {
      errors.push(error);
    };

    runCli();
    await waitForMicrotasks();

    assert.equal(process.exitCode, 1);
    assert.equal(errors.length, 1);
    assert.match(String(errors[0]), /Unknown argument --wat/);
  } finally {
    process.argv = previousArgv;
    console.error = previousError;
    process.exitCode = previousExitCode;
  }
});

async function captureConsoleLog(run: () => Promise<void>) {
  const previousLog = console.log;
  const logs: string[] = [];

  try {
    console.log = (...args) => {
      logs.push(args.join(" "));
    };

    await run();
  } finally {
    console.log = previousLog;
  }

  return logs;
}

function waitForMicrotasks() {
  return new Promise<void>((resolve) => setImmediate(resolve));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
