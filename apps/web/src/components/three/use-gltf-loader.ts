import { useGLTF } from '@react-three/drei';

/**
 * Wraps Drei's `useGLTF` with its documented preload pattern. Call
 * `useGltfLoader.preload(url)` at module scope (outside any component,
 * e.g. right after a dynamic import resolves) to start fetching before
 * the component that needs it renders — Drei's own recommended pattern
 * for avoiding a loading flash on first mount. No model is preloaded by
 * this file itself.
 */
function useGltfLoader(url: string) {
  return useGLTF(url);
}

useGltfLoader.preload = (url: string) => useGLTF.preload(url);
useGltfLoader.clear = (url: string) => useGLTF.clear(url);

export { useGltfLoader };
