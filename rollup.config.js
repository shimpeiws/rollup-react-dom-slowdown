import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";
export default {
  input: "main.js",
  output: { dir: "dist", format: "es" },
  plugins: [
    replace({ preventAssignment: true, values: { "process.env.NODE_ENV": JSON.stringify("production") } }),
    nodeResolve({ browser: true }),
    commonjs(),
  ],
};
