# rollup 4.64 tree-shaking slowdown when bundling `react-dom/client`

Bundling a three-line React app takes about 1.5 seconds with rollup 4.63.6. With rollup 4.64.0 and 4.64.2 it takes more than a minute. Nearly all of that time is spent in tree-shaking.

## Reproduce

```sh
npm install
time npm run build                          # rollup 4.64.2: > 60 s

npm install --no-save rollup@4.63.6
time npm run build                          # rollup 4.63.6: ~1.5 s
```

`main.js` is the whole app:

```js
import { createElement } from "react";
import { createRoot } from "react-dom/client";
createRoot(document.getElementById("root")).render(createElement("p", null, "hi"));
```

[`rollup.config.js`](rollup.config.js) uses three plugins:

- `@rollup/plugin-replace` sets `process.env.NODE_ENV` to `"production"`.
- `@rollup/plugin-node-resolve` runs with `browser: true`.
- `@rollup/plugin-commonjs` uses its default options.

## Results

| rollup | build time |
|---|---|
| 4.63.6 | 1.5 s |
| 4.64.0 | > 30 s (stopped) |
| 4.64.2 | > 60 s (stopped) |

Environment: Node v24.16.0, macOS (Apple Silicon), react / react-dom 19.1.9. `package-lock.json` pins the exact dependency tree.

The slow runs were stopped instead of being allowed to finish. They are CPU-bound and their memory keeps growing. In a larger app a full slow run took about 4 minutes, with about 1.4 GB RSS.

## In a real app

A Vite 7.1.12 + React Router 7.9.6 SPA hit the same slowdown. `vite build` spent 5m55s in the "transforming" phase for 160 modules on GitHub Actions `ubuntu-latest`. Locally it took 3m48s. Pinning rollup to 4.63.5 brings the build back to about 1 second.

A stripped-down version of that setup (an empty root route and one index route, no app code) is fast on 4.63.6 and slow on 4.64.0. In the full app, bisecting published versions found 4.63.6 already slow, with 4.63.5 as the last fast release. App code may trigger a second, earlier regression. This repo only reproduces the 4.64.0 one.

## Profile

A `node --cpu-prof` run of the full-app build spent about 92% of its 224 s of self time in rollup tree-shaking. The top functions in `rollup/dist/es/shared/node-entry.js` were:

| function | self time |
|---|---|
| `trackEntityAtPathAndGetIfTracked` | 45.6 s |
| `includeCallArgumentsWhenCalledAtPath` | 37.2 s |
| `includeCallArgumentsOfPossibleValues` | 31.9 s |
| `includeInteractionWithoutThis` | 10.8 s |

## Suspected change

4.64.0 contains one feature: [rollup/rollup#6541](https://github.com/rollup/rollup/pull/6541), "Retain callbacks of helper methods called from try statements". The production build of react-dom has many `try` blocks, and the hot functions above handle call arguments. This is a guess; I have not bisected individual commits.
