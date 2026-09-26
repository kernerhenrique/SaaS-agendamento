import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton } from "@/components/skeletons";

/** Carregamento padrão das telas do painel (o menu continua visível). */
export default function AdminLoading() {
  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6" aria-busy aria-label="Carregando">
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </main>
  );
}
