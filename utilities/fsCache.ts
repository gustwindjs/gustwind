import * as fs from "https://deno.land/std@0.207.0/fs/mod.ts";
import { Md5 } from "https://deno.land/std@0.119.0/hash/md5.ts";
import * as path from "node:path";

const md5 = new Md5();
async function fsCache(dir: string) {
  await fs.ensureDir(dir);

  return {
    get: async (k: string) => {
      try {
        return JSON.parse(
          await Deno.readTextFile(
            path.join(dir, md5.update(k).toString() + ".json"),
          ),
        );
      } catch (_error) {
        return;
      }
    },
    set: (k: string, v: unknown) =>
      Deno.writeTextFile(
        path.join(dir, md5.update(k).toString() + ".json"),
        JSON.stringify(v),
      ),
  };
}

export { fsCache };
