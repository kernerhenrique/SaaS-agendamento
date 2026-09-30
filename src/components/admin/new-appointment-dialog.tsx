"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { UserCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ofLabel, selectLabel } from "@/config/vertical";
import { useVertical } from "@/config/vertical-context";
import { localMinutesToUtc, todayInTimeZone, utcToLocalMinutes } from "@/lib/date";
import { minutesToTimeInput } from "@/lib/weekday";
import { formatPhoneBR } from "@/lib/phone";
import type { Weekday } from "@/generated/prisma/enums";
import { evaluateLocalSlot, type WorkingHoursWindow } from "@/server/modules/appointment/admin-booking-rules";

import { BookingTimeNotice, useNow } from "./booking-time-notice";

export interface NewAppointmentInitial {
  date?: string;
  professionalId?: string;
  /** "HH:MM" */
  time?: string;
  /** Aberto a partir da ficha do cliente: já vem com nome/telefone. */
  client?: { name: string; phone: string; email?: string | null };
}

interface KnownClient {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

type WeeklyHours = WorkingHoursWindow & { weekday: Weekday };

interface ProfessionalChoice {
  id: string;
  name: string;
  services: { id: string; name: string; durationMin: number }[];
  workingHours: WeeklyHours[];
}

interface ApiProfessional {
  id: string;
  name: string;
  active: boolean;
  professionalServices: { service: { id: string; name: string; durationMin: number; active: boolean; deletedAt: string | null } }[];
  workingHours: WeeklyHours[];
}

function parseTimeToMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Hoje: próximo quarto de hora a partir de agora (nunca abre já no passado). Outro dia: 09:00. */
function defaultTime(date: string | undefined, timeZone: string): string {
  const today = todayInTimeZone(timeZone);
  if (date && date !== today) return "09:00";
  const next = Math.ceil(utcToLocalMinutes(new Date(), timeZone) / 15) * 15;
  return next >= 24 * 60 ? "23:45" : minutesToTimeInput(next);
}

/**
 * Encaixe manual, aberto de qualquer tela pelo AdminShellProvider (barra
 * superior, navegação inferior, clique na agenda). Busca os profissionais ao
 * abrir, então nunca mostra uma lista desatualizada.
 */
export function NewAppointmentDialog({
  open,
  initial,
  timezone,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  initial?: NewAppointmentInitial;
  timezone: string;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo agendamento</DialogTitle>
          <DialogDescription>Encaixe manual direto na agenda.</DialogDescription>
        </DialogHeader>
        {/* Só monta enquanto aberto: cada abertura começa do `initial` atual. */}
        {open ? (
          <NewAppointmentForm
            initial={initial}
            timezone={timezone}
            onDone={() => {
              onOpenChange(false);
              onCreated();
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function NewAppointmentForm({
  initial,
  timezone,
  onDone,
}: {
  initial?: NewAppointmentInitial;
  timezone: string;
  onDone: () => void;
}) {
  const { terms } = useVertical();
  const [professionals, setProfessionals] = useState<ProfessionalChoice[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [date, setDate] = useState(initial?.date ?? todayInTimeZone(timezone));
  const [professionalId, setProfessionalId] = useState(initial?.professionalId ?? "");
  const [serviceId, setServiceId] = useState("");
  const [time, setTime] = useState(() => initial?.time ?? defaultTime(initial?.date, timezone));
  const [clientName, setClientName] = useState(initial?.client?.name ?? "");
  const [clientPhone, setClientPhone] = useState(initial?.client ? formatPhoneBR(initial.client.phone) : "");
  const [clientEmail, setClientEmail] = useState(initial?.client?.email ?? "");
  const [knownClient, setKnownClient] = useState<KnownClient | null>(null);

  // Telefone é a chave do cliente: se já existe cadastro, mostra quem é e
  // preenche o nome, em vez de renomear o cadastro sem avisar.
  useEffect(() => {
    const digits = clientPhone.replace(/\D/g, "");
    if (digits.length < 10) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(`/api/admin/clients/lookup?phone=${digits}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { client: KnownClient | null } | null) => {
          if (cancelled || !data) return;
          setKnownClient(data.client);
          if (data.client) {
            const found = data.client;
            setClientName((current) => (current.trim() ? current : found.name));
            setClientEmail((current) => (current.trim() ? current : (found.email ?? "")));
          }
        })
        .catch(() => undefined);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [clientPhone]);
  const matchedClient = knownClient && clientPhone.replace(/\D/g, "") === knownClient.phone ? knownClient : null;
  const willRename = matchedClient != null && clientName.trim() !== "" && clientName.trim() !== matchedClient.name;
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/professionals")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { professionals: ApiProfessional[] }) => {
        if (cancelled) return;
        const options = data.professionals
          .filter((p) => p.active)
          .map((p) => ({
            id: p.id,
            name: p.name,
            services: p.professionalServices
              .map((ps) => ps.service)
              .filter((s) => s.active && !s.deletedAt)
              .map((s) => ({ id: s.id, name: s.name, durationMin: s.durationMin })),
            workingHours: p.workingHours,
          }));
        setProfessionals(options);
        // Uma agenda só (profissional logado ou negócio de uma pessoa): já vem escolhida.
        if (options.length === 1) setProfessionalId((current) => current || options[0].id);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedProfessional = professionals?.find((p) => p.id === professionalId);
  const availableServices = useMemo(() => selectedProfessional?.services ?? [], [selectedProfessional]);
  const now = useNow();
  const startMinute = parseTimeToMinutes(time);
  const selectedService = availableServices.find((s) => s.id === serviceId);
  // Sem serviço escolhido ainda, avalia com 1 min: já avisa passado/dia sem expediente.
  const slot =
    selectedProfessional && date && startMinute !== null
      ? evaluateLocalSlot({
          date,
          startMinute,
          durationMin: selectedService?.durationMin ?? 1,
          timeZone: timezone,
          now,
          weeklyHours: selectedProfessional.workingHours,
        })
      : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const minutes = parseTimeToMinutes(time);
    if (!date || !professionalId || !serviceId || minutes === null || !clientName.trim() || !clientPhone.trim()) {
      setError("Preencha todos os campos obrigatórios");
      return;
    }
    if (slot?.isPast) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId,
          serviceId,
          startAt: localMinutesToUtc(date, minutes, timezone).toISOString(),
          client: { name: clientName, phone: clientPhone, email: clientEmail || undefined },
          // O botão já disse "Agendar mesmo assim" — é a confirmação do dono.
          allowOutsideHours: slot?.isOutsideHours ?? false,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "Não foi possível criar o agendamento");
        return;
      }
      toast.success("Agendamento criado.");
      onDone();
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loadError) {
    return <p className="text-sm text-destructive">Não foi possível carregar a lista. Feche e tente de novo.</p>;
  }
  if (!professionals) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-2/3" />
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="na-professional">{terms.professional.singular}</Label>
        <Select
          value={professionalId}
          onValueChange={(value) => {
            setProfessionalId(value ?? "");
            setServiceId("");
          }}
        >
          <SelectTrigger id="na-professional">
            {/* SelectValue do Base UI só conhece o `value`: a função resolve o rótulo. */}
            <SelectValue placeholder={selectLabel(terms.professional)}>
              {(value: string) => professionals.find((p) => p.id === value)?.name ?? selectLabel(terms.professional)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {professionals.map((professional) => (
              <SelectItem key={professional.id} value={professional.id}>
                {professional.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="na-service">{terms.service.singular}</Label>
        <Select value={serviceId} onValueChange={(value) => setServiceId(value ?? "")} disabled={!professionalId}>
          <SelectTrigger id="na-service">
            <SelectValue placeholder={selectLabel(terms.service)}>
              {(value: string) => {
                const service = availableServices.find((s) => s.id === value);
                return service ? `${service.name} (${service.durationMin}min)` : selectLabel(terms.service);
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableServices.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                {service.name} ({service.durationMin}min)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="na-date">Data</Label>
          <Input
            id="na-date"
            type="date"
            min={todayInTimeZone(timezone)}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="na-time">Horário</Label>
          <Input id="na-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} required />
        </div>
      </div>

      {slot && selectedProfessional ? (
        <BookingTimeNotice
          professionalName={selectedProfessional.name}
          isPast={slot.isPast}
          isOutsideHours={slot.isOutsideHours}
          workingHours={slot.workingHours}
        />
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="na-client-phone">WhatsApp {ofLabel(terms.client)}</Label>
        <Input
          id="na-client-phone"
          type="tel"
          inputMode="numeric"
          placeholder="(11) 91234-5678"
          value={clientPhone}
          onChange={(event) => setClientPhone(formatPhoneBR(event.target.value))}
          aria-describedby={matchedClient ? "na-client-found" : undefined}
          required
        />
        {matchedClient ? (
          <p id="na-client-found" className="flex items-center gap-1.5 text-caption text-muted-foreground">
            <UserCheck className="size-3.5 shrink-0 text-success" />
            Já cadastrado: <span className="font-medium text-foreground">{matchedClient.name}</span>
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="na-client-name">Nome {ofLabel(terms.client)}</Label>
        <Input
          id="na-client-name"
          value={clientName}
          onChange={(event) => setClientName(event.target.value)}
          aria-describedby={willRename ? "na-client-rename" : undefined}
          required
        />
        {willRename ? (
          <p id="na-client-rename" className="text-caption text-muted-foreground">
            O cadastro será atualizado de “{matchedClient.name}” para “{clientName.trim()}”.{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
              onClick={() => setClientName(matchedClient.name)}
            >
              Manter {matchedClient.name}
            </button>
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="na-client-email">E-mail {ofLabel(terms.client)} (opcional)</Label>
        <Input
          id="na-client-email"
          type="email"
          value={clientEmail}
          onChange={(event) => setClientEmail(event.target.value)}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting || slot?.isPast}>
          {isSubmitting ? "Salvando..." : slot?.isOutsideHours && !slot.isPast ? "Agendar mesmo assim" : "Criar agendamento"}
        </Button>
      </DialogFooter>
    </form>
  );
}
