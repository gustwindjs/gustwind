"Deno" in globalThis || u();
function u() {
  console.log("Initializing editor");
  let e = !1, t = document.createElement("button");
  t.style.position = "fixed",
    t.style.right = "1em",
    t.style.bottom = "1em",
    t.innerText = "\u{1F433}\u{1F4A8}",
    t.onclick = async () => {
      let [c, a, d] = await Promise.all([
          import("https://esm.sh/@twind/core@1.1.1"),
          import("/twindSetup.js"),
          import("/globalUtilities.js"),
          import("/componentUtilities.js"),
        ]).then(([{ install: i, tw: r }, m, p, g]) => {
          let n = m.default, l = p.init({}), s = g.init({});
          return console.log("loaded custom twind setup", n),
            console.log("loaded global utilities", l),
            console.log("loaded component utilities", s),
            i({ ...n, hash: !1 }),
            [r, l, s];
        }).catch((i) => console.error(i)),
        o = await import("/pageEditor.js");
      e ? o.toggleEditorVisibility() : (e = !0, o.createEditor(c, a, d));
    },
    document.body.appendChild(t);
}
