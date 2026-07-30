'use client';

import { Loader } from '@react-three/drei';

/**
 * An HTML overlay (Drei's `<Loader>`, driven by three.js's global loading
 * manager via `useProgress` internally) — render it as a SIBLING of
 * `<SceneCanvas>`, never inside it (Canvas's children must be three.js
 * scene objects, not DOM elements):
 *
 *   <div style={{ position: 'relative' }}>
 *     <SceneCanvas>...</SceneCanvas>
 *     <AssetLoader />
 *   </div>
 */
function AssetLoader() {
  return <Loader />;
}

export { AssetLoader };
