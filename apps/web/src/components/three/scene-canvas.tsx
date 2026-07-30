'use client';

import * as React from 'react';
import { Canvas, type CanvasProps } from '@react-three/fiber';

export interface SceneCanvasProps extends CanvasProps {
  /** Fallback for the INNER (in-canvas) Suspense boundary — must be three.js-renderable
   * content (a mesh, or nothing), not HTML. For a visible loading UI, render `<AssetLoader />`
   * as a SIBLING of this component, not as this prop — see components/three/README.md. */
  fallback?: React.ReactNode;
}

/**
 * Thin `<Canvas>` wrapper with sane defaults — no scene/mesh content of
 * its own. WebGL can't render on the server: every consumer MUST import
 * this via `next/dynamic(() => import(...), { ssr: false })`, never
 * directly, or Next's SSR pass will crash on `window`/`document` access
 * deep in three.js. Nothing in this codebase imports this file yet.
 */
function SceneCanvas({
  fallback = null,
  dpr = [1, 2],
  shadows = false,
  children,
  ...props
}: SceneCanvasProps) {
  return (
    <Canvas dpr={dpr} shadows={shadows} {...props}>
      <React.Suspense fallback={fallback}>{children}</React.Suspense>
    </Canvas>
  );
}

export { SceneCanvas };
