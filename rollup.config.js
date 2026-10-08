// The reproduction: no plugins, just tree-shaking one pre-flattened ES module.
export default {
  input: "bundle-input.js",
  output: { dir: "dist", format: "es" },
};
