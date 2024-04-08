export default [
  {
    isExternal: false,
    name: "toggleEditor",
    externals: [
      // TODO: Disabled for now as likely this has to be rewritten anyway
      // "/pageEditor.js",
      "/styleSetup.js",
      "/globalUtilities.js",
      "/componentUtilities.js",
    ],
  },
  { isExternal: true, name: "pageEditor", externals: [] },
];
