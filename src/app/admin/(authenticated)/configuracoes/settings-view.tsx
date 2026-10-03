"use client";

import { CalendarCheck, CalendarOff, Clock, KeyRound, Palette, Store, type LucideIcon } from "lucide-react";

import type { BusinessSettings } from "@/server/modules/business/business.service";

import { AccountSection } from "./account-section";
import { BrandingSection } from "./branding-section";
import { BusinessSection } from "./business-section";
import { ClosuresSection } from "./closures-section";
import { HoursSection } from "./hours-section";
import { PoliciesSection } from "./policies-section";

const SECTIONS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "negocio", label: "Negócio", icon: Store },
  { id: "identidade", label: "Identidade", icon: Palette },
  { id: "horario", label: "Horário", icon: Clock },
  { id: "fechados", label: "Dias fechados", icon: CalendarOff },
  { id: "reservas", label: "Reservas", icon: CalendarCheck },
  { id: "conta", label: "Conta", icon: KeyRound },
];

/**
 * Configurações em seções (padrão Vercel): cada cartão salva sozinho. Índice
 * lateral fixo no desktop; no celular, uma faixa de atalhos rolável no topo.
 */
export function SettingsView({ business, email }: { business: BusinessSettings | null; email: string }) {
  // Sem os dados do negócio (profissional): só a seção Conta.
  const sections = business ? SECTIONS : SECTIONS.filter((section) => section.id === "conta");
  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-page-title font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          {business ? "Dados do negócio, identidade, horário, regras de reserva e sua senha." : "Sua conta de acesso ao painel."}
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[11rem_1fr] lg:items-start lg:gap-8">
        <nav aria-label="Seções das configurações" className="-mx-4 overflow-x-auto px-4 lg:sticky lg:top-20 lg:mx-0 lg:px-0">
          <ul className="flex gap-2 lg:flex-col lg:gap-1">
            {sections.map(({ id, label, icon: Icon }) => (
              <li key={id} className="shrink-0">
                <a
                  href={`#${id}`}
                  className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none lg:rounded-md lg:border-0"
                >
                  <Icon className="size-4" />
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col gap-6">
          {business ? (
            <>
              <BusinessSection business={business} />
              <BrandingSection business={business} />
              <HoursSection business={business} />
              <ClosuresSection timezone={business.timezone} />
              <PoliciesSection business={business} />
            </>
          ) : null}
          <AccountSection email={email} />
        </div>
      </div>
    </main>
  );
}
