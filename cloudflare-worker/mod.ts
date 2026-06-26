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
type CloudflareFetchContext<E extends Record<string, unknown>> =
  & CloudflareWorkerContext<E>
  & {
    assets?: CloudflareAssetFetcher;
    options: CloudflareWorkerOptions<E>;
    pathname: string;
    renderPromise: Promise<RenderFn>;
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
    throw new Error(
      "createCloudflareWorker requires either render or initialPlugins",
    );
  }

  return {
    async fetch(request, env, ctx) {
      const methodResponse = validateMethod(request);

      if (methodResponse) {
        return methodResponse;
      }

      const url = new URL(request.url);
      const pathname = url.pathname;
      const fetchContext: CloudflareFetchContext<E> = {
        assets: getAssetFetcher(env, options.assetsBinding),
        ctx,
        env,
        options,
        pathname,
        renderPromise,
        request,
      };
      const assetResponse = await getPreferredAssetResponse(fetchContext);

      if (assetResponse) {
        return assetResponse;
      }

      try {
        return await renderWorkerResponse(fetchContext);
      } catch (error) {
        return handleWorkerError(fetchContext, error);
      }
    },
  };
}

function validateMethod(request: Request) {
  if (["GET", "HEAD"].includes(request.method)) {
    return;
  }

  return new Response("Method Not Allowed", {
    headers: { allow: "GET, HEAD" },
    status: 405,
  });
}

async function getPreferredAssetResponse<E extends Record<string, unknown>>(
  { assets, pathname, request }: CloudflareFetchContext<E>,
) {
  if (!assets || !shouldPreferAssets(pathname)) {
    return;
  }

  return fetchAsset(assets, request);
}

async function renderWorkerResponse<E extends Record<string, unknown>>(
  fetchContext: CloudflareFetchContext<E>,
) {
  const { markup, tasks } = await renderWorkerMarkup(fetchContext);

  handleWorkerTasks(fetchContext, tasks);

  return new Response(
    fetchContext.request.method === "HEAD" ? null : markup,
    {
      headers: {
        "content-type": getContentType(fetchContext.pathname),
      },
      status: 200,
    },
  );
}

async function renderWorkerMarkup<E extends Record<string, unknown>>(
  fetchContext: CloudflareFetchContext<E>,
) {
  const render = await fetchContext.renderPromise;
  const initialContext = fetchContext.options.getRenderContext
    ? await fetchContext.options.getRenderContext(fetchContext)
    : {};

  return render(fetchContext.pathname, initialContext);
}

function handleWorkerTasks<E extends Record<string, unknown>>(
  fetchContext: CloudflareFetchContext<E>,
  tasks: Tasks,
) {
  if (!fetchContext.options.handleTasks || tasks.length === 0) {
    return;
  }

  fetchContext.ctx.waitUntil(Promise.resolve(
    fetchContext.options.handleTasks({
      ...fetchContext,
      tasks,
    }),
  ));
}

async function handleWorkerError<E extends Record<string, unknown>>(
  fetchContext: CloudflareFetchContext<E>,
  error: unknown,
) {
  const assetResponse = await getFallbackAssetResponse(fetchContext);

  if (assetResponse) {
    return assetResponse;
  }

  if (fetchContext.options.onError) {
    return await fetchContext.options.onError({
      ...fetchContext,
      error,
    });
  }

  if (isMissingRouteError(error, fetchContext.pathname)) {
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

async function getFallbackAssetResponse<E extends Record<string, unknown>>(
  { assets, pathname, request }: CloudflareFetchContext<E>,
) {
  if (!assets || shouldPreferAssets(pathname)) {
    return;
  }

  return fetchAsset(assets, request);
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
  return error instanceof Error &&
    error.message === `Failed to render ${pathname}`;
}

function shouldPreferAssets(pathname: string) {
  return getLastPathSegment(pathname).includes(".");
}

export { createCloudflareWorker, initRender };
export type {
  CloudflareAssetFetcher,
  CloudflareExecutionContext,
  CloudflareWorker,
  CloudflareWorkerContext,
  CloudflareWorkerOptions,
};
