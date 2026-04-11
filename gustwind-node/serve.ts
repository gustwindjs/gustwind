import {
  createServer as createHttpServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { contentType } from "../utilities/contentType.ts";

type StaticServer = {
  close(): Promise<void>;
  port: number;
  url: string;
};

async function startStaticServer(
  {
    cwd,
    input,
    port = 3000,
    host = "127.0.0.1",
  }: {
    cwd: string;
    input: string;
    port?: number;
    host?: string;
  },
): Promise<StaticServer> {
  const httpServer = createHttpServer(async (req, res) => {
    await handleRequest({ req, res, cwd, input });
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, host, () => {
      httpServer.off("error", reject);
      resolve();
    });
  });
  const address = httpServer.address();
  const listeningPort = typeof address === "object" && address
    ? address.port
    : port;

  return {
    async close() {
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => error ? reject(error) : resolve());
      });
    },
    port: listeningPort,
    url: `http://${host}:${listeningPort}/`,
  };
}

async function handleRequest(
  {
    req,
    res,
    cwd,
    input,
  }: {
    req: IncomingMessage;
    res: ServerResponse;
    cwd: string;
    input: string;
  },
) {
  const pathname = new URL(req.url || "/", "http://127.0.0.1").pathname;
  const assetPath = path.join(
    cwd,
    input,
    pathname,
    path.extname(pathname) ? "" : "index.html",
  );

  try {
    const asset = await readFile(assetPath);

    sendResponse(res, 200, asset, contentType(path.extname(assetPath)));
    return;
  } catch (_) {
    console.error("Failed to find", assetPath);
  }

  sendResponse(res, 404, "No matching route", contentType(".txt"));
}

function sendResponse(
  res: ServerResponse,
  status: number,
  body: string | Uint8Array,
  type: string,
) {
  res.statusCode = status;
  res.setHeader("Content-Type", type);
  res.end(body);
}

export type { StaticServer };
export { startStaticServer };
