export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-xl bg-slate-800"
          />
        ))}
      </div>

      <div className="h-72 animate-pulse rounded-xl bg-slate-800" />
    </div>
  );
}
