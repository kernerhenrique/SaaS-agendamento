"use client";

import { useState } from "react";
import { ChevronLeft, MapPin, MessageCircle } from "lucide-react";

import { AccentColorScope } from "@/components/accent-color-scope";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Stepper } from "@/components/stepper";
import { BRAND } from "@/config/brand";
import { getVertical } from "@/config/vertical";
import { VerticalProvider } from "@/config/vertical-context";
import { buildGoogleMapsUrl } from "@/lib/maps";
import { getInitials } from "@/lib/text";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { lockedBookingNotice } from "@/server/modules/appointment/booking-policy";
import { cn } from "cn";

import { BusinessDetails } from "./business-details";
import { ConfirmationStep, type ConfirmedAppointmentInfo } from "./confirmation-step";
import { ContactStep, type ContactInfo } from "./contact-step";
import { DatetimeStep } from "./datetime-step";
import { ProfessionalStep } from "./professional-step";
import { ServiceStep } from "./service-step";
import { SummaryPanel } from "./summary-panel";
import {
  NO_PREFERENCE,
  type AvailableSlot,
  type BookingSelection,
  type BusinessInfo,
  type ProfessionalOption,
  type ServiceOption,
} from "./types";

// Coluna central com largura máxima (como Cal.com/Calendly): em telas largas
// o conteúdo não se estica de ponta a ponta. Header e corpo usam a mesma.
const CONTENT_WIDTH_CLASS = "mx-auto w-full max-w-6xl";

export function BookingFlow({
  business,
  services,
  professionals,
}: {
  business: BusinessInfo;
  services: ServiceOption[];
  professionals: ProfessionalOption[];
}) {
  const [step, setStep] = useState(1);
  const [selection, setSelection] = useState<BookingSelection>({
    service: null,
    professionalId: null,
    date: null,
    slot: null,
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Dados do cliente e o aviso de horário perdido ficam aqui: sobrevivem ao "Voltar".
  const [contact, setContact] = useState<ContactInfo>({ name: "", phone: "", email: "" });
  const [slotNotice, setSlotNotice] = useState<string | null>(null);
  // Calculado ao escolher o horário (evento, não renderização: "agora" não pode variar entre servidor e cliente).
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<ConfirmedAppointmentInfo | null>(
    null,
  );

  // Plano Solo: quem atende já está decidido, então a escolha do profissional some
  // (Serviço → Horário → Contato). Só vale com uma pessoa que faz o serviço.
  const soloProfessionalFor = (serviceId: string) => {
    if (!business.solo) return null;
    const eligible = professionals.filter((professional) => professional.serviceIds.includes(serviceId));
    return eligible.length === 1 ? eligible[0].id : null;
  };
  const skipsProfessional = selection.service != null && soloProfessionalFor(selection.service.id) != null;

  function goBack() {
    setStep((current) => (current === 3 && skipsProfessional ? 1 : Math.max(1, current - 1)));
  }

  function handleSelectService(service: ServiceOption) {
    const soloProfessional = soloProfessionalFor(service.id);
    setSelection((prev) => ({ ...prev, service, professionalId: soloProfessional, slot: null }));
    setSlotNotice(null);
    setStep(soloProfessional ? 3 : 2);
  }

  function handleSelectProfessional(professionalId: string | typeof NO_PREFERENCE) {
    setSelection((prev) => ({ ...prev, professionalId, slot: null }));
    setSlotNotice(null);
    setStep(3);
  }

  function handleSelectSlot(slot: AvailableSlot) {
    setSelection((prev) => ({ ...prev, slot }));
    setSlotNotice(null);
    setLockedNotice(lockedBookingNotice(new Date(slot.startAt), new Date(), business.cancellationDeadlineHours, business.name));
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
        if (data?.code === "SLOT_UNAVAILABLE") {
          // Outra pessoa reservou antes: volta aos horários do mesmo dia, sem o horário perdido no resumo e com os dados guardados.
          setSelection((prev) => ({ ...prev, slot: null }));
          setSlotNotice("Esse horário acabou de ser reservado por outra pessoa. Escolha outro: seus dados continuam preenchidos.");
          setStep(3);
          return;
        }
        setSubmitError(data?.error ?? "Não foi possível confirmar o agendamento");
        return;
      }

      setConfirmedAppointment({
        id: data.appointment.id,
        manageToken: data.appointment.manageToken,
        startAt: data.appointment.startAt,
        endAt: data.appointment.endAt,
        serviceName: data.appointment.service.name,
        professionalName: data.appointment.professional.name,
        businessName: data.appointment.business.name,
        businessAddress: business.address,
        businessWhatsapp: business.whatsapp,
        timezone: data.appointment.business.timezone,
        clientEmail: contact.email?.trim() || null,
        changeLocked: lockedBookingNotice(new Date(data.appointment.startAt), new Date(), business.cancellationDeadlineHours, business.name) != null,
      });
      setStep(5);
    } finally {
      setIsSubmitting(false);
    }
  }

  const { terms } = getVertical(business.businessType);

  return (
    <VerticalProvider verticalKey={business.businessType}>
    <AccentColorScope accentColor={business.accentColor} className="flex flex-1 flex-col">
      <main className="flex flex-1 flex-col">
        {business.coverUrl && step === 1 ? (
          // eslint-disable-next-line @next/next/no-img-element -- capa vem de URL externa arbitrária, sem domínio fixo para configurar no next/image
          <img src={business.coverUrl} alt="" className="h-32 w-full object-cover sm:h-52" />
        ) : null}
        <header className="border-b bg-card p-4 shadow-sm sm:p-6">
          <div className={CONTENT_WIDTH_CLASS}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                {business.logoUrl ? (
                  <Avatar className="size-12">
                    <AvatarImage src={business.logoUrl} alt="" />
                    <AvatarFallback>{getInitials(business.name)}</AvatarFallback>
                  </Avatar>
                ) : null}
                <div className="min-w-0">
                  <h1 className="text-page-title font-bold">{business.name}</h1>
                  {business.address ? (
                    <a
                      href={buildGoogleMapsUrl(business.address)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
                    >
                      <MapPin className="size-3.5 shrink-0" />
                      {business.address}
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {business.whatsapp ? (
                  // <a> nativo (não <Button render>): precisa continuar role="link"
                  // para leitores de tela, ver comentário em confirmation-step.tsx.
                  <a
                    href={buildWhatsAppUrl(business.whatsapp)}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    <MessageCircle />
                    WhatsApp
                  </a>
                ) : null}
                <ThemeToggle />
              </div>
            </div>
            {step === 1 ? <BusinessDetails business={business} /> : null}
            {step <= 4 ? (
              <div className="mt-4">
                {business.solo ? (
                  <Stepper steps={[terms.service.singular, "Horário", "Contato"]} currentStep={step <= 2 ? 1 : step - 1} />
                ) : (
                  <Stepper
                    steps={[terms.service.singular, terms.professional.singular, "Horário", "Contato"]}
                    currentStep={step}
                  />
                )}
              </div>
            ) : null}
          </div>
        </header>

        <div className="flex flex-1 flex-col p-4 sm:p-6">
          <div className={cn(CONTENT_WIDTH_CLASS, "flex flex-1 flex-col gap-6 sm:flex-row")}>
            <div className="min-w-0 flex-1">
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
                  maxWindowDays={business.maxBookingWindowDays}
                  closures={business.closures}
                  initialDate={selection.date}
                  notice={slotNotice}
                  onDateChange={(date) => setSelection((prev) => ({ ...prev, date }))}
                  onSelect={handleSelectSlot}
                />
              ) : null}

              {step === 4 ? (
                <ContactStep
                  isSubmitting={isSubmitting}
                  error={submitError}
                  policyText={business.policyText}
                  lockedNotice={lockedNotice}
                  value={contact}
                  onChange={setContact}
                  onSubmit={handleSubmitContact}
                />
              ) : null}

              {step === 5 && confirmedAppointment ? (
                <ConfirmationStep appointment={confirmedAppointment} />
              ) : null}

              {step > 1 && step <= 4 ? (
                <Button variant="ghost" className="mt-4" onClick={goBack}>
                  <ChevronLeft />
                  Voltar
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
                  className="sticky top-6 hidden w-72 shrink-0 self-start rounded-xl border-l-4 border-l-primary bg-card p-5 shadow-sm ring-1 ring-foreground/10 sm:block"
                />
                {/* Resumo fixo no rodapé no mobile */}
                <SummaryPanel
                  selection={selection}
                  professionals={professionals}
                  timezone={business.timezone}
                  compact
                  className="fixed inset-x-0 bottom-0 border-t bg-background p-4 shadow-fixed-bar sm:hidden"
                />
              </>
            ) : null}
          </div>
        </div>

        {/* pb-28 no mobile: deixa espaço para o resumo fixo no rodapé. */}
        <footer className="flex flex-col gap-1 px-4 pt-2 pb-28 text-center text-caption text-muted-foreground sm:pb-6">
          <span>
            {BRAND.poweredByLabel} {BRAND.name}
          </span>
          <span>
            <a href="/privacidade" target="_blank" className="underline-offset-4 hover:underline">
              Privacidade
            </a>{" "}
            ·{" "}
            <a href="/termos" target="_blank" className="underline-offset-4 hover:underline">
              Termos
            </a>
          </span>
        </footer>
      </main>
    </AccentColorScope>
    </VerticalProvider>
  );
}
