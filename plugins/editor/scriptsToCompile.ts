export default [
  {
    isExternal: false,
    name: "toggleEditor",
    externals: [
      "/pageEditor.js",
      "/styleSetup.js",
      "/globalUtilities.js",
      "/componentUtilities.js",
    ],
  },
  { isExternal: true, name: "pageEditor", externals: [] },
];
