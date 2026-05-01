export function VersionBadge() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
  const fullCommit = process.env.NEXT_PUBLIC_GIT_COMMIT ?? "local";
  const commit = fullCommit.slice(0, 7);

  return (
    <div className="fixed bottom-3 right-3 z-50 text-[10px] font-mono text-gray-400 bg-white/80 backdrop-blur-sm border border-gray-200 rounded px-2 py-0.5 select-none pointer-events-none">
      v{version} · {commit}
    </div>
  );
}
