import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8" aria-busy="true">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-32" />
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-3 bg-bg p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <CardSkeleton rows={5} />
          <CardSkeleton rows={4} />
        </div>
        <div className="space-y-6">
          <CardSkeleton rows={3} />
          <CardSkeleton rows={3} />
        </div>
      </div>
    </div>
  );
}

function CardSkeleton({ rows }: { rows: number }) {
  return (
    <div className="border border-border bg-bg">
      <div className="flex items-center justify-between border-b border-border p-5">
        <div className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-7 w-24" />
      </div>
      <ul className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="flex items-center gap-4 px-5 py-3.5">
            <Skeleton className="size-9 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-7 w-20" />
          </li>
        ))}
      </ul>
    </div>
  );
}
