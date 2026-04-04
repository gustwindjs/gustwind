function urlJoin(...parts: string[]) {
  if (!parts.length) {
    return "";
  }

  return parts.reduce((ret, part, index) => {
    if (!part) {
      return ret;
    }

    if (!index) {
      return part.replace(/\/+$/, "");
    }

    return `${ret.replace(/\/+$/, "")}/${part.replace(/^\/+/, "")}`;
  }, "").replace(/(?<!:)\/{2,}/g, "/");
}

export { urlJoin };
