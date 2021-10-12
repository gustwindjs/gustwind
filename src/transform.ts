function transform(name?: string | unknown, input?: unknown): Promise<unknown> {
  if (!name) {
    return Promise.resolve(input);
  }

  return import(`../transforms/${name}.ts`).then((o) => o.default(input) || "");
}

export default transform;
