"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ofLabel, selectLabel } from "@/config/vertical";
import { useVertical } from "@/config/vertical-context";
import { localMinutesToUtc } from "@/lib/date";
import { formatPhoneBR } from "@/lib/phone";

import type { ProfessionalOption } from "./types";

function parseTimeToMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function NewAppointmentDialog({
  professionals,
  defaultDate,
  timezone,
  onCreated,
}: {
  professionals: ProfessionalOption[];
  defaultDate: string;
  timezone: string;
  onCreated: () => void | Promise<void>;
}) {
  const { terms } = useVertical();
  const [open, setOpen] = useState(false);
  const [professionalId, setProfessionalId] = useState<string>("");
  const [serviceId, setServiceId] = useState<string>("");
  const [time, setTime] = useState("09:00");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProfessional = professionals.find((p) => p.id === professionalId);
  const availableServices = useMemo(
    () => selectedProfessional?.services ?? [],
    [selectedProfessional],
  );

  function resetForm() {
    setProfessionalId("");
    setServiceId("");
    setTime("09:00");
    setClientName("");
    setClientPhone("");
    setClientEmail("");
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const minutes = parseTimeToMinutes(time);
    if (!professionalId || !serviceId || minutes === null || !clientName.trim() || !clientPhone.trim()) {
      setError("Preencha todos os campos obrigatórios");
      return;
    }

    setIsSubmitting(true);
    try {
      const startAt = localMinutesToUtc(defaultDate, minutes, timezone);
      const response = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId,
          serviceId,
          startAt: startAt.toISOString(),
          client: {
            name: clientName,
            phone: clientPhone,
            email: clientEmail || undefined,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "Não foi possível criar o agendamento");
        return;
      }
      resetForm();
      setOpen(false);
      await onCreated();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus />
        Novo agendamento
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo agendamento</DialogTitle>
          <DialogDescription>Encaixe manual na agenda do dia selecionado.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="professional">{terms.professional.singular}</Label>
            <Select
              value={professionalId}
              onValueChange={(value) => {
                setProfessionalId(value ?? "");
                setServiceId("");
              }}
            >
              <SelectTrigger id="professional">
                {/* SelectValue não resolve o rótulo do SelectItem sozinho (Base
                    UI só sabe o `value`) — precisa de função para mapear o texto. */}
                <SelectValue placeholder={selectLabel(terms.professional)}>
                  {(value: string) =>
                    professionals.find((professional) => professional.id === value)?.name ??
                    selectLabel(terms.professional)
                  }
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
            <Label htmlFor="service">{terms.service.singular}</Label>
            <Select
              value={serviceId}
              onValueChange={(value) => setServiceId(value ?? "")}
              disabled={!professionalId}
            >
              <SelectTrigger id="service">
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="time">Horário</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="clientName">Nome {ofLabel(terms.client)}</Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="clientPhone">WhatsApp {ofLabel(terms.client)}</Label>
            <Input
              id="clientPhone"
              value={clientPhone}
              type="tel"
              inputMode="numeric"
              placeholder="(11) 91234-5678"
              onChange={(event) => setClientPhone(formatPhoneBR(event.target.value))}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="clientEmail">E-mail {ofLabel(terms.client)} (opcional)</Label>
            <Input
              id="clientEmail"
              type="email"
              value={clientEmail}
              onChange={(event) => setClientEmail(event.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Criar agendamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
