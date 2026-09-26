"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { newLabel } from "@/config/vertical";
import { useVertical } from "@/config/vertical-context";

import { ProfessionalForm } from "../professional-form";
import type { ServiceOption } from "../types";

export function NewProfessionalView({ services, timezone }: { services: ServiceOption[]; timezone: string }) {
  const { terms } = useVertical();
  const router = useRouter();

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/admin/profissionais"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          {terms.professional.plural}
        </Link>
        <h1 className="text-page-title font-bold">{newLabel(terms.professional)}</h1>
      </div>
      <ProfessionalForm
        services={services}
        timezone={timezone}
        onSaved={({ id }) => {
          toast.success("Cadastro criado.");
          router.push(`/admin/profissionais/${id}`);
        }}
      />
    </main>
  );
}
