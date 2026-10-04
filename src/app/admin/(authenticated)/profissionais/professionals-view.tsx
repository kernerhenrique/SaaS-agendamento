"use client";

import Link from "next/link";
import { Plus, Users } from "lucide-react";

import { ProfessionalAvatar } from "@/components/admin/professional-avatar";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { emptyLabel, newLabel } from "@/config/vertical";
import { useVertical } from "@/config/vertical-context";
import { WEEKDAY_LABELS, WEEKDAY_ORDER, WEEKDAY_SHORT, minutesToTimeInput } from "@/lib/weekday";
import { cn } from "cn";

import type { ProfessionalListItem } from "./types";

export function ProfessionalsView({ professionals }: { professionals: ProfessionalListItem[] }) {
  const { terms } = useVertical();
  const newButton = (
    <Link href="/admin/profissionais/novo" className={buttonVariants()}>
      <Plus />
      {newLabel(terms.professional)}
    </Link>
  );

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-page-title font-bold">{terms.professional.plural}</h1>
        {newButton}
      </div>

      {professionals.length === 0 ? (
        <EmptyState icon={Users} title={emptyLabel(terms.professional)} action={newButton} />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {professionals.map((professional) => (
            <li key={professional.id}>
              <Link
                href={`/admin/profissionais/${professional.id}`}
                className="block h-full rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <Card
                  size="sm"
                  className={cn("h-full transition-colors hover:bg-muted/50", !professional.active && "opacity-70")}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <ProfessionalAvatar
                        name={professional.name}
                        photoUrl={professional.photoUrl}
                        color={professional.color}
                      />
                      <div className="flex min-w-0 flex-col">
                        <CardTitle className="truncate text-base">{professional.name}</CardTitle>
                        {professional.specialty ? (
                          <span className="truncate text-caption text-muted-foreground">{professional.specialty}</span>
                        ) : null}
                      </div>
                      {!professional.active ? (
                        <Badge variant="outline" className="ml-auto">
                          Inativo
                        </Badge>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 text-sm">
                    <p className="line-clamp-2">
                      <span className="font-medium">{terms.service.plural}: </span>
                      {professional.professionalServices.map((ps) => ps.service.name).join(", ") || "—"}
                    </p>
                    <WeeklyMiniGrid workingHours={professional.workingHours} />
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function WeeklyMiniGrid({ workingHours }: { workingHours: ProfessionalListItem["workingHours"] }) {
  const byWeekday = new Map(workingHours.map((wh) => [wh.weekday, wh]));

  return (
    <div>
      <span className="font-medium">Expediente</span>
      {workingHours.length === 0 ? (
        <p className="mt-1 text-caption text-warning">Sem expediente configurado — não recebe agendamentos.</p>
      ) : (
        <div className="mt-1 grid grid-cols-7 gap-1">
          {WEEKDAY_ORDER.map((weekday) => {
            const wh = byWeekday.get(weekday);
            const label = WEEKDAY_LABELS[weekday];
            return (
              <div
                key={weekday}
                title={
                  wh
                    ? `${label}: ${minutesToTimeInput(wh.startMinute)}–${minutesToTimeInput(wh.endMinute)}`
                    : `${label}: folga`
                }
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-md py-1.5 text-caption font-semibold",
                  wh ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground/70",
                )}
              >
                <span aria-hidden>{WEEKDAY_SHORT[weekday]}</span>
                <span className="sr-only">{wh ? `${label}, das ${minutesToTimeInput(wh.startMinute)} às ${minutesToTimeInput(wh.endMinute)}` : `${label}, folga`}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
