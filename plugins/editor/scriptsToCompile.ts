export default [
  {
    isExternal: false,
    name: "toggleEditor",
    externals: ["/pageEditor.js", "/twindSetup.js"],
  },
  { isExternal: true, name: "pageEditor", externals: [] },
];
