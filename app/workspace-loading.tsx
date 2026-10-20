import MemoryLoading from './memory-loading';
export default function WorkspaceLoading({ ko = false }: { ko?: boolean }) {
  return <section className="workspace-loading"><MemoryLoading ko={ko}/></section>;
}
