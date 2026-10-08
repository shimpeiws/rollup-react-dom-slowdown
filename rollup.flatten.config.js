// Regenerates bundle-input.js: React + react-dom flattened into one ES module,
// with tree-shaking off so the file keeps everything the plugins produced.
// Run it with rollup 4.63.6 (see README). The checked-in file came from this config.
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";
export default {
  input: "main.js",
  treeshake: false,
  output: { file: "bundle-input.js", format: "es" },
  plugins: [
    replace({ preventAssignment: true, values: { "process.env.NODE_ENV": JSON.stringify("production") } }),
    nodeResolve({ browser: true }),
    commonjs(),
  ],
};
