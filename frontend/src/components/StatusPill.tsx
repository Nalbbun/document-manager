export function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'INDEXED' ? 'success' : status === 'FAILED' ? 'danger' : status === 'UNSEARCHABLE' ? 'warning' : 'neutral';
  return <span className={`status-pill ${tone}`}>{status}</span>;
}

