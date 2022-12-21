function respond(
  status: number,
  text: string | Uint8Array,
  contentType = "text/plain",
) {
  return new Response(text, {
    headers: { "content-type": contentType },
    status,
  });
}

export { respond };
