import { DashboardSkeleton } from "@/components/app/DashboardSkeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-surface px-6 py-8 lg:px-10 lg:py-10">
      <DashboardSkeleton />
    </main>
  );
}
