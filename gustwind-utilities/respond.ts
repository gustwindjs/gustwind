function respond(
  status: number,
  text: string | Uint8Array,
  contentType = "text/plain",
) {
  const body = typeof text === "string"
    ? text
    : new Blob([new Uint8Array(text)], { type: contentType });

  return new Response(body, {
    headers: { "content-type": contentType },
    status,
  });
}

export { respond };
