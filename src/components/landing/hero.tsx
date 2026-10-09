import { MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";

import { landingButton } from "./landing-config";
import { WhatsAppCta } from "./landing-links";

const AGENDA = [
  { time: "13:00", client: "Helena Prado", detail: "Corte · com Diego", isNew: false },
  { time: "14:30", client: "Beatriz Nunes", detail: "Corte + barba · com Bruno", isNew: true },
  { time: "16:00", client: "Pedro Alves", detail: "Barba · com Bruno", isNew: false },
  { time: "17:30", client: "Juliana Costa", detail: "Corte · com Diego", isNew: false },
] as const;

const PHONE_TIMES = [
  { t: "13:00", off: true },
  { t: "13:30", off: false },
  { t: "14:00", off: true },
  { t: "14:30", sel: true },
  { t: "15:00", off: false },
  { t: "15:30", off: true },
] as const;

/** Faixa de "horários" decorativa ao fundo das áreas verdes. */
export function SlotPattern({ className, cells = 20, lit = [1, 7, 10, 16] }: { className?: string; cells?: number; lit?: number[] }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute grid gap-2.5", className)}>
      {Array.from({ length: cells }, (_, i) => (
        <i key={i} className={cn("h-4.5 rounded-full", lit.includes(i) ? "bg-brand-mint/35" : "bg-on-brand/8")} />
      ))}
    </div>
  );
}

/**
 * Primeira dobra: a promessa e o produto em uso. Um único momento animado no
 * carregamento: o cliente escolhe 14:30 no celular, confirma, e o atendimento entra
 * na agenda com o selo "Novo"; logo depois, a mensagem do WhatsApp fica pronta.
 */
export function Hero() {
  return (
    <section id="inicio" aria-labelledby="h-hero" className="scroll-mt-20 pt-9 pb-14 lg:pt-16 lg:pb-22">
      <div className="mx-auto grid max-w-290 gap-10 px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-14">
        <div>
          <h1 className="max-w-[13ch] text-[clamp(2.4rem,6.4vw,4rem)] leading-[1.02] font-bold tracking-[-0.035em] text-balance">
            Seu cliente marca sozinho. Você só atende.
          </h1>
          <p className="mt-5 max-w-[52ch] text-[clamp(1.0625rem,2vw,1.1875rem)] text-muted-foreground">
            A Aprazzo dá ao seu negócio uma página de agendamento com a sua marca. O cliente escolhe o horário pelo celular,
            sem baixar aplicativo, e o atendimento cai direto na agenda. Lembretes no WhatsApp, clientes e recebimentos
            ficam no mesmo lugar.
          </p>
          <div id="hero-cta" className="mt-7 flex flex-wrap gap-3 max-sm:[&>a]:w-full">
            <WhatsAppCta section="hero" />
            <a href="#como-funciona" className={cn(landingButton.base, landingButton.ghost)}>
              Ver como funciona
            </a>
          </div>
          <p className="mt-6 max-w-[52ch] text-sm text-muted-foreground">
            Para <strong className="font-semibold text-foreground">barbearias, salões, estúdios de tatuagem, clínicas e consultórios</strong>.
            Entregamos tudo configurado, pronto para usar.
          </p>
        </div>

        <figure
          aria-label="Ilustração: o cliente escolhe 14:30 no celular e o horário aparece na agenda do dia"
          className="relative m-0 overflow-hidden rounded-4xl bg-brand-cover p-4 pb-10 sm:min-h-105 sm:p-7 lg:min-h-145 lg:p-10"
        >
          <SlotPattern className="-top-2.5 -right-2.5 w-[80%] grid-cols-4 opacity-90 sm:w-[62%]" />

          <div aria-hidden className="relative ml-auto w-full rounded-2xl bg-card px-4.5 pt-4.5 pb-2.5 text-card-foreground shadow-float sm:w-[min(100%,430px)]">
            <div className="mb-3 flex items-baseline justify-between">
              <b className="font-heading text-lg tracking-tight">Próximos atendimentos</b>
              <span className="text-sm whitespace-nowrap text-muted-foreground">hoje</span>
            </div>
            {AGENDA.map((a) => (
              <div
                key={a.time}
                className={cn(
                  "grid grid-cols-[54px_1fr_auto] items-center gap-2.5 overflow-hidden border-t px-1 py-2.5 text-sm",
                  a.isNew && "-mx-1.5 rounded-xl border-transparent bg-primary-soft px-2.5 motion-safe:animate-slot-in [&+div]:border-transparent",
                )}
              >
                <time className="font-bold tabular-nums">{a.time}</time>
                <div className="min-w-0">
                  <b className="block truncate font-semibold">{a.client}</b>
                  <small className="block truncate text-caption text-muted-foreground">{a.detail}</small>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-caption font-semibold whitespace-nowrap",
                    a.isNew ? "border-primary bg-card text-primary" : "bg-card",
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", a.isNew ? "bg-primary" : "bg-success")} />
                  {a.isNew ? "Novo" : "Confirmado"}
                </span>
              </div>
            ))}
          </div>

          <div
            aria-hidden
            className="absolute -bottom-17.5 left-4.5 hidden w-52.5 rounded-4xl border border-on-brand/60 bg-card p-2.5 shadow-float sm:block lg:-bottom-14 lg:left-8.5 lg:w-59"
          >
            <div className="overflow-hidden rounded-3xl bg-background px-3 pt-3.5 pb-4.5">
              <div className="mb-2.5 flex items-center gap-2">
                <i className="size-6.5 shrink-0 rounded-lg bg-foreground" />
                <div>
                  <b className="block font-heading text-xs leading-tight">Barbearia Exemplo</b>
                  <small className="block text-[10.5px] font-medium text-muted-foreground">Agende seu horário</small>
                </div>
              </div>
              <div className="mt-2 mb-1.5 text-[11px] font-semibold text-muted-foreground">Serviço</div>
              <div className="flex justify-between gap-1.5 rounded-lg border-[1.5px] border-primary bg-card px-2.5 py-2 text-xs">
                <b className="font-semibold">Corte + barba</b>
                <span>1 h</span>
              </div>
              <div className="mt-2 mb-1.5 text-[11px] font-semibold text-muted-foreground">Hoje</div>
              <div className="grid grid-cols-3 gap-1.5">
                {PHONE_TIMES.map((s) => (
                  <span
                    key={s.t}
                    className={cn(
                      "rounded-lg border py-1.5 text-center text-[11.5px] font-semibold tabular-nums",
                      "sel" in s
                        ? "border-primary bg-primary text-primary-foreground motion-safe:animate-pick"
                        : s.off
                          ? "border-muted bg-muted text-muted-foreground line-through"
                          : "bg-card",
                    )}
                  >
                    {s.t}
                  </span>
                ))}
              </div>
              <div className="mt-2.5 rounded-lg bg-primary py-2 text-center text-xs font-semibold text-primary-foreground motion-safe:animate-press">
                Confirmar agendamento
              </div>
            </div>
          </div>
          {/* Depois que o atendimento entra, a confirmação já está pronta: selo flutuante ao lado do celular. */}
          <p
            aria-hidden
            className="relative mt-3 ml-auto flex w-fit items-center gap-2 rounded-full bg-card px-3.5 py-2 text-caption font-semibold text-success shadow-float motion-safe:animate-bubble-in motion-safe:[animation-delay:2.3s] sm:absolute sm:right-7 sm:bottom-14 lg:right-10 lg:bottom-20"
          >
            <MessageCircle className="size-3.5 shrink-0" aria-hidden />
            Confirmação pronta no WhatsApp
          </p>
          <figcaption className="absolute bottom-3.5 left-4 text-caption font-semibold text-brand-mint sm:right-4 sm:left-auto">
            Ilustração com dados fictícios
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
