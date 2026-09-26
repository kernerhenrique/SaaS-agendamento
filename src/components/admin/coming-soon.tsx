import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/empty-state";

/** Tela prevista no menu mas ainda não construída (entra numa fase futura do roadmap). */
export function ComingSoon({ title, icon, description }: { title: string; icon: LucideIcon; description: string }) {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      <h1 className="text-page-title font-bold">{title}</h1>
      <EmptyState icon={icon} title="Em breve" description={description} />
    </main>
  );
}
