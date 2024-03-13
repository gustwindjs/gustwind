// Original work of Jason Miller, licensed under Apache License
// https://github.com/developit/htm/blob/master/src/build.mjs
// Forked from version 3.1.1
const MODE_SLASH = 0;
const MODE_TEXT = 1;
const MODE_WHITESPACE = 2;
const MODE_TAGNAME = 3;
const MODE_COMMENT = 4;
const MODE_PROP_SET = 5;
const MODE_PROP_APPEND = 6;

const CHILD_APPEND = 0;
const CHILD_RECURSE = 2;
const TAG_SET = 3;
const PROPS_ASSIGN = 4;
const PROP_SET = MODE_PROP_SET;
const PROP_APPEND = MODE_PROP_APPEND;

const CACHES = new Map();

export function htm(statics) {
  let tmp = CACHES.get(this);

  if (!tmp) {
    tmp = new Map();
    CACHES.set(this, tmp);
  }

  tmp = evaluate(
    this,
    tmp.get(statics) || (tmp.set(statics, (tmp = build(statics))), tmp),
    arguments,
    []
  );

  return tmp.length > 1 ? tmp : tmp[0];
}

export const evaluate = (h, built, fields, args) => {
  // `build()` used the first element of the operation list as
  // temporary workspace. Now that `build()` is done we can use
  // that space to track whether the current element is "dynamic"
  // (i.e. it or any of its descendants depend on dynamic values).
  built[0] = 0;

  for (let i = 1; i < built.length; i++) {
    const type = built[i++];
    const value = built[++i];

    if (type === TAG_SET) {
      args[0] = value;
    } else if (type === PROPS_ASSIGN) {
      args[1] = Object.assign(args[1] || {}, value);
    } else if (type === PROP_SET) {
      (args[1] = args[1] || {})[built[++i]] = value;
    } else if (type === PROP_APPEND) {
      args[1][built[++i]] += value + "";
    } else if (type) {
      // type === CHILD_RECURSE
      // Set the operation list (including the staticness bits) as
      // `this` for the `h` call.
      const tmp = h.apply(value, evaluate(h, value, fields, ["", null]));
      args.push(tmp);

      // Rewrite the operation list in-place.
      // The currently evaluated piece `CHILD_RECURSE, 0, [...]` becomes
      // `CHILD_APPEND, 0, tmp`.
      // Essentially the operation list gets optimized for potential future
      // re-evaluations.
      built[i - 2] = CHILD_APPEND;
      built[i] = tmp;
    } else {
      // type === CHILD_APPEND
      args.push(value);
    }
  }

  return args;
};

export const build = function (statics) {
  let mode = MODE_TEXT;
  let buffer = "";
  let quote = "";
  let current = [0];
  let char, propName;

  const commit = (field) => {
    if (
      mode === MODE_TEXT &&
      (field || (buffer = buffer.replace(/^\s*\n\s*|\s*\n\s*$/g, "")))
    ) {
      current.push(CHILD_APPEND, field, buffer);
    } else if (mode === MODE_TAGNAME && (field || buffer)) {
      current.push(TAG_SET, field, buffer);
      mode = MODE_WHITESPACE;
    } else if (mode === MODE_WHITESPACE && buffer === "..." && field) {
      current.push(PROPS_ASSIGN, field, 0);
    } else if (mode === MODE_WHITESPACE && buffer && !field) {
      current.push(PROP_SET, 0, true, buffer);
    } else if (mode >= MODE_PROP_SET) {
      if (buffer || (!field && mode === MODE_PROP_SET)) {
        current.push(mode, 0, buffer, propName);
        mode = MODE_PROP_APPEND;
      }
      if (field) {
        current.push(mode, field, 0, propName);
        mode = MODE_PROP_APPEND;
      }
    }

    buffer = "";
  };

  for (let i = 0; i < statics.length; i++) {
    if (i) {
      if (mode === MODE_TEXT) {
        commit();
      }
      commit(i);
    }

    for (let j = 0; j < statics[i].length; j++) {
      char = statics[i][j];

      if (mode === MODE_TEXT) {
        if (char === "<") {
          // commit buffer
          commit();
          current = [current];
          mode = MODE_TAGNAME;
        } else {
          buffer += char;
        }
      } else if (mode === MODE_COMMENT) {
        // Ignore everything until the last three characters are '-', '-' and '>'
        if (buffer === "--" && char === ">") {
          mode = MODE_TEXT;
          buffer = "";
        } else {
          buffer = char + buffer[0];
        }
      } else if (quote) {
        if (char === quote) {
          quote = "";
        } else {
          buffer += char;
        }
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === ">") {
        commit();
        mode = MODE_TEXT;
      } else if (!mode) {
        // Ignore everything until the tag ends
      } else if (char === "=") {
        mode = MODE_PROP_SET;
        propName = buffer;
        buffer = "";
      } else if (
        char === "/" &&
        (mode < MODE_PROP_SET || statics[i][j + 1] === ">")
      ) {
        commit();
        if (mode === MODE_TAGNAME) {
          current = current[0];
        }
        mode = current;
        (current = current[0]).push(CHILD_RECURSE, 0, mode);
        mode = MODE_SLASH;
      } else if (
        char === " " ||
        char === "\t" ||
        char === "\n" ||
        char === "\r"
      ) {
        // <a disabled>
        commit();
        mode = MODE_WHITESPACE;
      } else {
        buffer += char;
      }

      if (mode === MODE_TAGNAME && buffer === "!--") {
        mode = MODE_COMMENT;
        current = current[0];
      }
    }
  }
  commit();

  return current;
};