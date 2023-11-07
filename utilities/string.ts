function trim(str: string, char: string) {
  if (!str) {
    throw new Error("No string to trim!");
  }

  // Exception for /
  if (str === char) {
    return str;
  }

  // Adapted from https://www.sitepoint.com/trimming-strings-in-javascript/
  return str.replace(new RegExp("^[" + char + "]+"), "").replace(
    new RegExp("[" + char + "]+$"),
    "",
  );
}

export { trim };
