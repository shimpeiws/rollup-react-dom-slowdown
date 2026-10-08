# rollup 4.64 tree-shaking slowdown on react-dom

Rollup 4.64 takes minutes to tree-shake react-dom. Rollup 4.63.6 does it in under a second. The reproduction uses no plugins: plain `rollup -c` on one ES module.

## Reproduce

```sh
npm install                                 # installs rollup 4.64.2
time npm run build                          # > 60 s, CPU-bound

npm install --no-save rollup@4.63.6
time npm run build                          # ~0.5 s
```

[`rollup.config.js`](rollup.config.js) is the whole build config. It has no plugins:

```js
export default {
  input: "bundle-input.js",
  output: { dir: "dist", format: "es" },
};
```

[`bundle-input.js`](bundle-input.js) is React 19.1.9 and react-dom 19.1.9 (production build), flattened into one ES module (573 KB). It is the output of [`rollup.flatten.config.js`](rollup.flatten.config.js) applied to this three-line app ([`main.js`](main.js)):

```js
import { createElement } from "react";
import { createRoot } from "react-dom/client";
createRoot(document.getElementById("root")).render(createElement("p", null, "hi"));
```

The flatten step runs with rollup 4.63.6 and `treeshake: false`, through `@rollup/plugin-replace` (`NODE_ENV=production`), `@rollup/plugin-node-resolve` (`browser: true`) and `@rollup/plugin-commonjs`. To regenerate the file:

```sh
npm install --no-save rollup@4.63.6
npm run flatten        # produces the same bytes as the checked-in bundle-input.js
```

The plugins are only needed to produce the input. Building `main.js` through them directly shows the same slowdown (4.63.6: 1.5 s, 4.64.2: > 60 s).

## Results

| rollup | `npm run build` |
|---|---|
| 4.63.6 | 0.6 s |
| 4.64.2 | > 60 s (stopped) |
| 4.64.2, `treeshake: false` | 1.2 s |

The second and third rows only differ in `treeshake`, so the extra time is spent in tree-shaking. The slow runs were stopped at 60 seconds rather than left to finish: they are CPU-bound and their memory keeps growing. In a larger app, a full slow run took about 4 minutes and used about 1.4 GB RSS.

With the plugin build of `main.js`, 4.64.0 was also slow (stopped after 30 s). The vite + React Router setup described below is fast on 4.63.6 and slow on 4.64.0.

`package-lock.json` pins the exact dependency tree.

### Environment

`npx envinfo --system --binaries --npmPackages` output, with install paths removed:

```
System:
  OS: macOS 26.5.2 (25F84)
  CPU: (6) arm64 Apple A18 Pro
  Memory: 8.00 GB
  Model: Mac17,5
Binaries:
  Node: 24.16.0
  npm: 11.13.0
npmPackages:
  @rollup/plugin-commonjs: 28.0.6
  @rollup/plugin-node-resolve: 16.0.1
  @rollup/plugin-replace: 6.0.2
  react: 19.1.9
  react-dom: 19.1.9
  rollup: 4.64.2
```

## In a real app

A Vite 7.1.12 + React Router 7.9.6 SPA hit the same slowdown. On GitHub Actions `ubuntu-latest`, `vite build` spent 5m55s in the "transforming" phase for 160 modules. Locally it took 3m48s. Pinning rollup to 4.63.5 brings the build back to about 1 second.

A stripped-down version of that setup has an empty root route, one index route and no app code. It is fast on 4.63.6 and slow on 4.64.0.

In the full app, bisecting published versions found 4.63.6 already slow, with 4.63.5 as the last fast release. App code may trigger a second, earlier regression. This repo only reproduces the 4.64.0 one.

## Profile

A `node --cpu-prof` run of the full-app build spent about 92% of its 224 s of self time in rollup tree-shaking. The top functions in `rollup/dist/es/shared/node-entry.js` were:

| function | self time |
|---|---|
| `trackEntityAtPathAndGetIfTracked` | 45.6 s |
| `includeCallArgumentsWhenCalledAtPath` | 37.2 s |
| `includeCallArgumentsOfPossibleValues` | 31.9 s |
| `includeInteractionWithoutThis` | 10.8 s |

## Suspected change

4.64.0 contains one feature: [rollup/rollup#6541](https://github.com/rollup/rollup/pull/6541), "Retain callbacks of helper methods called from try statements". `bundle-input.js` contains 82 `try {` blocks, and the hot functions above handle call arguments. This is a guess. I have not bisected individual commits.

## License

`bundle-input.js` contains React and react-dom, which are MIT-licensed (Copyright (c) Meta Platforms, Inc. and affiliates). Their license headers are kept in the file.
