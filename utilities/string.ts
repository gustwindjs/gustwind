// https://stackoverflow.com/a/32516190/228885
function trim(s: string, c: string) {
  if (c === "]") c = "\\]";
  if (c === "^") c = "\\^";
  if (c === "\\") c = "\\\\";
  return s?.replace(
    new RegExp(
      "^[" + c + "]+|[" + c + "]+$",
      "g",
    ),
    "",
  );
}

export { trim };
