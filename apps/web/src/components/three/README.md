# 3D foundation (React Three Fiber)

`scene-canvas.tsx`, `use-gltf-loader.ts`, `environment.tsx`,
`asset-loader.tsx` — wrappers only, no scene/mesh content, nothing
imports these yet. **Must be loaded via `next/dynamic(() => import(...),
{ ssr: false })`** — WebGL cannot run during SSR. `AssetLoader` renders as
a SIBLING of `SceneCanvas`, never inside it (Canvas children must be
three.js scene objects, not HTML). See `docs/architecture/
design-system.md` §7.
