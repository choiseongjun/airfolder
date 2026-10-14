const empty: { contentType: string; contentUri: string; originalName?: string }[] = [];
const noop = () => {};
export function useIncomingShare() { return { resolvedSharedPayloads: empty, clearSharedPayloads: noop, isResolving: false, error: null }; }
