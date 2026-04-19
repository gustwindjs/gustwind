import { initRender } from "../render-runtime/mod.ts";
import type { PluginDefinition, RenderFn } from "../render-runtime/mod.ts";
import type { Tasks } from "../types.ts";

type CloudflareAssetFetcher = {
  fetch(input: Request | URL | string, init?: RequestInit): Promise<Response>;
};

type CloudflareExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException?(): void;
};

type CloudflareWorkerContext<E> = {
  ctx: CloudflareExecutionContext;
  env: E;
  request: Request;
};

type CloudflareWorker<E> = {
  fetch(
    request: Request,
    env: E,
    ctx: CloudflareExecutionContext,
  ): Response | Promise<Response>;
};

type CloudflareWorkerOptions<E extends Record<string, unknown>> = {
  assetsBinding?: keyof E & string;
  getRenderContext?(
    context: CloudflareWorkerContext<E>,
  ): Record<string, unknown> | Promise<Record<string, unknown>>;
  handleTasks?(
    context: CloudflareWorkerContext<E> & { tasks: Tasks },
  ): void | Promise<void>;
  initialPlugins?: PluginDefinition[];
  onError?(
    context: CloudflareWorkerContext<E> & { error: unknown },
  ): Response | Promise<Response>;
  render?: RenderFn;
};

function createCloudflareWorker<E extends Record<string, unknown>>(
  options: CloudflareWorkerOptions<E>,
): CloudflareWorker<E> {
  const renderPromise = options.render
    ? Promise.resolve(options.render)
    : options.initialPlugins
    ? initRender(options.initialPlugins)
    : undefined;

  if (!renderPromise) {
    throw new Error("createCloudflareWorker requires either render or initialPlugins");
  }

  return {
    async fetch(request, env, ctx) {
      if (!["GET", "HEAD"].includes(request.method)) {
        return new Response("Method Not Allowed", {
          headers: { allow: "GET, HEAD" },
          status: 405,
        });
      }

      const workerContext = { ctx, env, request };
      const url = new URL(request.url);
      const pathname = url.pathname;
      const assets = getAssetFetcher(env, options.assetsBinding);

      if (assets && shouldPreferAssets(pathname)) {
        const assetResponse = await fetchAsset(assets, request);

        if (assetResponse) {
          return assetResponse;
        }
      }

      try {
        const render = await renderPromise;
        const initialContext = options.getRenderContext
          ? await options.getRenderContext(workerContext)
          : {};
        const { markup, tasks } = await render(pathname, initialContext);

        if (options.handleTasks && tasks.length > 0) {
          ctx.waitUntil(Promise.resolve(options.handleTasks({
            ...workerContext,
            tasks,
          })));
        }

        return new Response(request.method === "HEAD" ? null : markup, {
          headers: {
            "content-type": getContentType(pathname),
          },
          status: 200,
        });
      } catch (error) {
        if (assets && !shouldPreferAssets(pathname)) {
          const assetResponse = await fetchAsset(assets, request);

          if (assetResponse) {
            return assetResponse;
          }
        }

        if (options.onError) {
          return await options.onError({
            ...workerContext,
            error,
          });
        }

        if (isMissingRouteError(error, pathname)) {
          return new Response("Not Found", {
            headers: { "content-type": "text/plain; charset=UTF-8" },
            status: 404,
          });
        }

        return new Response("Internal Server Error", {
          headers: { "content-type": "text/plain; charset=UTF-8" },
          status: 500,
        });
      }
    },
  };
}

function getAssetFetcher<E extends Record<string, unknown>>(
  env: E,
  assetsBinding = "ASSETS",
): CloudflareAssetFetcher | undefined {
  const candidate = env[assetsBinding];

  if (candidate && typeof candidate === "object" && "fetch" in candidate) {
    return candidate as CloudflareAssetFetcher;
  }
}

async function fetchAsset(
  assets: CloudflareAssetFetcher,
  request: Request,
) {
  const response = await assets.fetch(request);

  if (response.status === 404) {
    return;
  }

  return response;
}

function getContentType(pathname: string) {
  if (pathname.endsWith(".json")) {
    return "application/json; charset=UTF-8";
  }

  if (pathname.endsWith(".xml")) {
    return "application/xml; charset=UTF-8";
  }

  return "text/html; charset=UTF-8";
}

function getLastPathSegment(pathname: string) {
  const withoutTrailingSlash = pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;

  return withoutTrailingSlash.split("/").pop() || "";
}

function isMissingRouteError(error: unknown, pathname: string) {
  return error instanceof Error && error.message === `Failed to render ${pathname}`;
}

function shouldPreferAssets(pathname: string) {
  return getLastPathSegment(pathname).includes(".");
}

export { createCloudflareWorker };
export type {
  CloudflareAssetFetcher,
  CloudflareExecutionContext,
  CloudflareWorker,
  CloudflareWorkerContext,
  CloudflareWorkerOptions,
};
