export default function RouteFallback() {
  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-[#e8edfa]"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Loading…</span>
      <span
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600"
      />
    </div>
  );
}
