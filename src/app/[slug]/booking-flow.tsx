"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

import { ConfirmationStep, type ConfirmedAppointmentInfo } from "./confirmation-step";
import { ContactStep, type ContactInfo } from "./contact-step";
import { DatetimeStep } from "./datetime-step";
import { ProfessionalStep } from "./professional-step";
import { ServiceStep } from "./service-step";
import { StepIndicator } from "./step-indicator";
import { SummaryPanel } from "./summary-panel";
import {
  NO_PREFERENCE,
  type AvailableSlot,
  type BookingSelection,
  type BusinessInfo,
  type ProfessionalOption,
  type ServiceOption,
} from "./types";

const DEFAULT_ACCENT_COLOR = "#4F46E5";

export function BookingFlow({
  business,
  services,
  professionals,
}: {
  business: BusinessInfo;
  services: ServiceOption[];
  professionals: ProfessionalOption[];
}) {
  const accentColor = business.accentColor ?? DEFAULT_ACCENT_COLOR;

  const [step, setStep] = useState(1);
  const [selection, setSelection] = useState<BookingSelection>({
    service: null,
    professionalId: null,
    date: null,
    slot: null,
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] = useState<ConfirmedAppointmentInfo | null>(
    null,
  );

  function goBack() {
    setStep((current) => Math.max(1, current - 1));
  }

  function handleSelectService(service: ServiceOption) {
    setSelection((prev) => ({ ...prev, service, professionalId: null, slot: null }));
    setStep(2);
  }

  function handleSelectProfessional(professionalId: string | typeof NO_PREFERENCE) {
    setSelection((prev) => ({ ...prev, professionalId, slot: null }));
    setStep(3);
  }

  function handleSelectSlot(slot: AvailableSlot) {
    setSelection((prev) => ({ ...prev, slot }));
    setStep(4);
  }

  async function handleSubmitContact(contact: ContactInfo) {
    if (!selection.service || !selection.slot) return;

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/public/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          professionalId: selection.slot.professionalId,
          serviceId: selection.service.id,
          startAt: selection.slot.startAt,
          client: contact,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSubmitError(data?.error ?? "Não foi possível confirmar o agendamento");
        return;
      }

      setConfirmedAppointment({
        id: data.appointment.id,
        startAt: data.appointment.startAt,
        endAt: data.appointment.endAt,
        serviceName: data.appointment.service.name,
        professionalName: data.appointment.professional.name,
        businessName: data.appointment.business.name,
        businessAddress: business.address,
        timezone: data.appointment.business.timezone,
      });
      setStep(5);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{business.name}</h1>
            {business.address ? (
              <p className="text-sm text-muted-foreground">{business.address}</p>
            ) : null}
          </div>
          <ThemeToggle />
        </div>
        {step <= 4 ? (
          <div className="mt-4">
            <StepIndicator currentStep={step} accentColor={accentColor} />
          </div>
        ) : null}
      </header>

      <div className="flex flex-1 flex-col gap-6 p-4 pb-28 sm:flex-row sm:p-6 sm:pb-6">
        <div className="flex-1">
          {step === 1 ? <ServiceStep services={services} onSelect={handleSelectService} /> : null}

          {step === 2 && selection.service ? (
            <ProfessionalStep
              professionals={professionals}
              serviceId={selection.service.id}
              onSelect={handleSelectProfessional}
            />
          ) : null}

          {step === 3 && selection.service && selection.professionalId ? (
            <DatetimeStep
              businessId={business.id}
              serviceId={selection.service.id}
              professionalId={selection.professionalId}
              timezone={business.timezone}
              accentColor={accentColor}
              onSelect={handleSelectSlot}
            />
          ) : null}

          {step === 4 ? (
            <ContactStep
              accentColor={accentColor}
              isSubmitting={isSubmitting}
              error={submitError}
              onSubmit={handleSubmitContact}
            />
          ) : null}

          {step === 5 && confirmedAppointment ? (
            <ConfirmationStep appointment={confirmedAppointment} />
          ) : null}

          {step > 1 && step <= 4 ? (
            <Button variant="ghost" className="mt-4" onClick={goBack}>
              ← Voltar
            </Button>
          ) : null}
        </div>

        {step <= 4 ? (
          <>
            {/* Resumo fixo lateral no desktop */}
            <SummaryPanel
              selection={selection}
              professionals={professionals}
              timezone={business.timezone}
              className="hidden w-64 shrink-0 rounded-lg border p-4 sm:block"
            />
            {/* Resumo fixo no rodapé no mobile */}
            <SummaryPanel
              selection={selection}
              professionals={professionals}
              timezone={business.timezone}
              className="fixed inset-x-0 bottom-0 border-t bg-background p-4 sm:hidden"
            />
          </>
        ) : null}
      </div>
    </main>
  );
}
