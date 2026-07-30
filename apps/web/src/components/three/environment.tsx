import { Environment as DreiEnvironment, type EnvironmentProps } from '@react-three/drei';

/**
 * Thin re-export of Drei's `<Environment>` for HDRI-based lighting — kept
 * as our own module (not imported directly from `@react-three/drei` at
 * every call site) so a future default preset/path convention has one
 * place to change. Must be used inside a `<SceneCanvas>`; no HDRI asset
 * is bundled or preloaded by this file.
 */
function Environment(props: EnvironmentProps) {
  return <DreiEnvironment {...props} />;
}

export { Environment };
