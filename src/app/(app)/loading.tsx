export default function AppLoading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600"
        aria-hidden
      />
      <p className="text-sm text-slate-500">Cargando…</p>
    </div>
  );
}
