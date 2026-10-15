// Incoming sharing is disabled until a supported iOS extension is available.
// The Expo hook reads an app-group entitlement at render time and must not run without it.
const empty: { contentType: string; contentUri: string; originalName?: string }[] = [];
const noop = () => {};
export function useIncomingShare() {
  return { resolvedSharedPayloads: empty, clearSharedPayloads: noop, isResolving: false, error: null };
}
