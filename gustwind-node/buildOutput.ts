import { availableParallelism } from "node:os";
import * as path from "node:path";
import {
  mkdir,
  open,
  readdir,
  readFile,
  rm,
  unlink,
} from "node:fs/promises";

const retryableRemoveOutputErrors = new Set(["ENOTEMPTY", "EBUSY", "EPERM"]);

function getDefaultRouteConcurrency() {
  return Math.max(1, availableParallelism() - 1);
}

async function removeOutputDirectory(outputDirectory: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await rm(outputDirectory, { recursive: true, force: true });
      return;
    } catch (error) {
      if (!shouldRetryRemoveOutput(error, attempt)) {
        throw error;
      }

      await waitBeforeRemoveOutputRetry(attempt);
    }
  }
}

function shouldRetryRemoveOutput(error: unknown, attempt: number) {
  return attempt < 3 && retryableRemoveOutputErrors.has(getErrorCode(error));
}

function getErrorCode(error: unknown) {
  return error instanceof Error && "code" in error ? String(error.code) : "";
}

function waitBeforeRemoveOutputRetry(attempt: number) {
  return new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
}

async function removeOutputDirectoryContents(outputDirectory: string) {
  await mkdir(outputDirectory, { recursive: true });

  let entries: { name: string }[];

  try {
    entries = await readdir(outputDirectory, { withFileTypes: true });
  } catch {
    return;
  }

  await Promise.all(
    entries.map(async (entry) => {
      if (entry.name === ".gustwind") {
        return;
      }

      await removeOutputDirectory(path.join(outputDirectory, entry.name));
    }),
  );
}

async function acquireBuildLock(outputDirectory: string) {
  const lockDirectory = path.join(outputDirectory, ".gustwind");
  const lockPath = path.join(lockDirectory, "build.lock");

  await mkdir(lockDirectory, { recursive: true });

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await createBuildLockFile(lockPath);

      return async () => {
        await unlink(lockPath).catch(() => undefined);
      };
    } catch (error) {
      if (await shouldRetryBuildLock(error, lockPath)) {
        continue;
      }

      throwBuildLockError(outputDirectory, lockPath);
    }
  }

  throw new Error(`Failed to acquire Gustwind build lock at ${lockPath}`);
}

async function createBuildLockFile(lockPath: string) {
  const handle = await open(lockPath, "wx");

  await handle.writeFile(
    JSON.stringify({
      pid: process.pid,
      startedAt: new Date().toISOString(),
    }) + "\n",
  );
  await handle.close();
}

async function shouldRetryBuildLock(error: unknown, lockPath: string) {
  if (!isFileExistsError(error)) {
    throw error;
  }

  return await removeStaleBuildLock(lockPath);
}

function throwBuildLockError(outputDirectory: string, lockPath: string): never {
  throw new Error(
    `Another Gustwind build is already using ${outputDirectory}. ` +
      `Remove ${lockPath} if that build is no longer running.`,
  );
}

async function removeStaleBuildLock(lockPath: string) {
  let parsed: { pid?: unknown };

  try {
    parsed = JSON.parse(await readFile(lockPath, "utf8"));
  } catch {
    return false;
  }

  if (typeof parsed.pid !== "number" || isProcessRunning(parsed.pid)) {
    return false;
  }

  await unlink(lockPath).catch(() => undefined);

  return true;
}

function isProcessRunning(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return !(
      error instanceof Error &&
      "code" in error &&
      error.code === "ESRCH"
    );
  }
}

function isFileExistsError(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "EEXIST";
}

export {
  acquireBuildLock,
  getDefaultRouteConcurrency,
  removeOutputDirectoryContents,
};
