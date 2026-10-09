"use client";

import { useRef, useState } from "react";
import { Check, MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";

import { landingButton, track } from "./landing-config";
import { WhatsAppCta } from "./landing-links";

const SERVICES = [
  { id: "corte", name: "Corte de cabelo", dur: 40, price: "R$ 50", desc: "40 min" },
  { id: "barba", name: "Barba", dur: 30, price: "R$ 35", desc: "30 min" },
  { id: "combo", name: "Corte + barba", dur: 60, price: "R$ 80", desc: "1 h" },
] as const;
type Service = (typeof SERVICES)[number];

/** Atendimentos que já estão na agenda do Bruno (fictícios). */
const BUSY = [
  { start: "09:00", end: "09:40", title: "Rafael M.", sub: "Corte" },
  { start: "10:30", end: "11:30", title: "Marcos L.", sub: "Corte + barba" },
  { start: "13:00", end: "13:30", title: "André S.", sub: "Barba" },
  { start: "16:00", end: "16:40", title: "Pedro A.", sub: "Corte" },
];
const TIMES = ["09:00", "10:00", "11:30", "12:00", "13:00", "14:00", "14:30", "15:00", "16:00", "17:00"];
const HOURS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
const FIRST_HOUR = 9;
const ROW_PX = 56;

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const overlaps = (start: string, dur: number) => {
  const s = toMin(start);
  const e = s + dur;
  return e > 18 * 60 || BUSY.some((b) => s < toMin(b.end) && e > toMin(b.start));
};
const eventBox = (start: string, end: string) => ({
  top: ((toMin(start) - FIRST_HOUR * 60) / 60) * ROW_PX + 2,
  height: ((toMin(end) - toMin(start)) / 60) * ROW_PX - 4,
});

const optionBase =
  "w-full cursor-pointer rounded-[10px] border-[1.5px] bg-card text-left transition-[border-color,background-color,transform] duration-150 ease-brand active:scale-[0.99] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

/**
 * Demonstração: o visitante agenda como o cliente faria (serviço → horário → confirmar)
 * e vê o atendimento entrar na agenda do profissional. Nada é gravado de verdade.
 */
export function BookingDemo() {
  const [step, setStep] = useState(0);
  const [service, setService] = useState<Service | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const started = useRef(false);
  const paneRef = useRef<HTMLDivElement>(null);

  const begin = () => {
    if (!started.current) {
      started.current = true;
      track("demo_start");
    }
  };
  // Leva o foco ao título da etapa nova (leitor de tela e teclado acompanham).
  const go = (next: number) => {
    setStep(next);
    requestAnimationFrame(() => paneRef.current?.querySelector<HTMLElement>("[data-q]")?.focus({ preventScroll: true }));
  };
  const reset = () => {
    setService(null);
    setTime(null);
    go(0);
    track("demo_reset");
  };
  const end = service && time ? fmt(toMin(time) + service.dur) : null;
  const confirmed = step === 3;

  return (
    <div className="mt-10 grid gap-5 lg:grid-cols-2 lg:items-start lg:gap-7">
      {/* Lado do cliente */}
      <div className="rounded-4xl bg-card p-5.5 text-card-foreground sm:p-7">
        <div className="mb-4.5 flex items-center justify-between gap-3">
          <h3 className="font-heading text-xl font-bold tracking-tight">Página de agendamento</h3>
          <small className="text-sm whitespace-nowrap text-muted-foreground">Barbearia Exemplo</small>
        </div>
        <div aria-hidden className="mb-5 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-300", i < step || confirmed ? "bg-primary" : "bg-muted")} />
          ))}
        </div>

        <div ref={paneRef} aria-live="polite">
          <div key={step} className="motion-safe:animate-pane-in">
            {step === 0 ? (
              <>
                <p data-q tabIndex={-1} id="q0" className="mb-3.5 font-heading text-[22px] leading-tight font-bold tracking-tight outline-none">
                  Qual serviço?
                </p>
                <div role="group" aria-labelledby="q0" className="grid gap-2.5">
                  {SERVICES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={service?.id === s.id}
                      onClick={() => {
                        begin();
                        setService(s);
                        if (time && overlaps(time, s.dur)) setTime(null);
                      }}
                      className={cn(
                        optionBase,
                        "grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 px-4 py-3.5 hover:border-input",
                        service?.id === s.id ? "border-primary bg-primary-soft ring-1 ring-primary ring-inset" : "border-border",
                      )}
                    >
                      <b className="font-semibold">{s.name}</b>
                      <span className="font-bold tabular-nums">{s.price}</span>
                      <small className="col-span-2 text-sm text-muted-foreground">{s.desc}</small>
                    </button>
                  ))}
                </div>
                <DemoNav>
                  <button type="button" disabled={!service} onClick={() => go(1)} className={demoPrimary}>
                    Escolher horário
                  </button>
                </DemoNav>
              </>
            ) : null}

            {step === 1 && service ? (
              <>
                <p data-q tabIndex={-1} id="q1" className="mb-3.5 font-heading text-[22px] leading-tight font-bold tracking-tight outline-none">
                  Qual horário na quinta-feira?
                </p>
                <div role="group" aria-labelledby="q1" className="grid grid-cols-3 gap-2.5 min-[480px]:grid-cols-4">
                  {TIMES.map((t) => {
                    const off = overlaps(t, service.dur);
                    return (
                      <button
                        key={t}
                        type="button"
                        disabled={off}
                        aria-label={off ? `${t}, indisponível` : undefined}
                        aria-pressed={time === t}
                        onClick={() => {
                          begin();
                          setTime(t);
                        }}
                        className={cn(
                          optionBase,
                          "min-h-12 text-center text-base font-semibold tabular-nums enabled:active:scale-[0.96]",
                          time === t
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input enabled:hover:border-primary enabled:hover:bg-primary-soft",
                          "disabled:cursor-not-allowed disabled:border-muted disabled:bg-muted disabled:text-muted-foreground disabled:line-through",
                        )}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Horários riscados já estão ocupados para {service.name.toLowerCase()} ({service.desc}).
                </p>
                <DemoNav>
                  <button type="button" onClick={() => go(0)} className={demoBack}>
                    Voltar
                  </button>
                  <button type="button" disabled={!time} onClick={() => go(2)} className={demoPrimary}>
                    Revisar
                  </button>
                </DemoNav>
              </>
            ) : null}

            {step === 2 && service && time && end ? (
              <>
                <p data-q tabIndex={-1} className="mb-3.5 font-heading text-[22px] leading-tight font-bold tracking-tight outline-none">
                  Confira e confirme
                </p>
                <dl className="grid gap-2 rounded-[10px] border-[1.5px] p-4">
                  {[
                    ["Serviço", service.name],
                    ["Profissional", "Bruno"],
                    ["Quando", `quinta · ${time}–${end}`],
                    ["Valor", service.price],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="text-right font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-sm text-muted-foreground">
                  Na página de verdade, o cliente informa nome e WhatsApp e recebe o link para cancelar ou remarcar sozinho.
                </p>
                <DemoNav>
                  <button type="button" onClick={() => go(1)} className={demoBack}>
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      go(3);
                      track("demo_complete", { service: service.id, time });
                    }}
                    className={demoPrimary}
                  >
                    Confirmar agendamento
                  </button>
                </DemoNav>
              </>
            ) : null}

            {confirmed && service && time ? (
              <div>
                <div aria-hidden className="mb-3.5 flex size-13 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Check className="size-6.5" strokeWidth={3} />
                </div>
                <p data-q tabIndex={-1} className="font-heading text-[22px] leading-tight font-bold tracking-tight outline-none">
                  Agendamento simulado
                </p>
                <p className="mt-2 text-muted-foreground">
                  {service.name}, quinta-feira, às {time}. Veja ao lado como ele chega na agenda do Bruno, sem ninguém precisar
                  digitar nada.
                </p>
                <DemoNav>
                  <button type="button" onClick={reset} className={demoBack}>
                    Refazer a demonstração
                  </button>
                </DemoNav>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Lado do negócio */}
      <div className="rounded-4xl bg-card p-5.5 text-card-foreground sm:p-7">
        <div className="mb-4.5 flex items-center justify-between gap-3">
          <h3 className="font-heading text-xl font-bold tracking-tight">Agenda do Bruno</h3>
          <small className="text-sm whitespace-nowrap text-muted-foreground">quinta-feira</small>
        </div>
        <div role="img" aria-label="Agenda do profissional das 9h às 18h" className="relative grid grid-cols-[52px_1fr]">
          <div aria-hidden className="grid grid-rows-[repeat(9,56px)] text-[12.5px] text-muted-foreground tabular-nums">
            {HOURS.map((h) => (
              <span key={h} className="-translate-y-2">
                {h}
              </span>
            ))}
          </div>
          <div className="relative grid grid-rows-[repeat(9,56px)] border-l">
            {HOURS.map((h) => (
              <i key={h} className="border-t" />
            ))}
            {BUSY.map((b) => (
              <AgendaEvent key={b.start} start={b.start} end={b.end} title={b.title} sub={b.sub} tone="busy" />
            ))}
            {service && time && end && !confirmed ? (
              <div
                className="absolute inset-x-2 flex items-center justify-center rounded-[10px] border-2 border-dashed border-primary/40 text-sm font-medium text-muted-foreground"
                style={eventBox(time, end)}
              >
                Horário escolhido
              </div>
            ) : null}
            {confirmed && service && time && end ? (
              <AgendaEvent start={time} end={end} title="Cliente da demonstração" sub={service.name} tone="new" />
            ) : null}
          </div>
        </div>
        <div aria-live="polite" className="mt-3.5 min-h-6">
          {confirmed && service && time ? (
            <div className="motion-safe:animate-bubble-in">
              <p className="text-[15px] font-semibold text-primary">Novo agendamento na agenda: {time}, {service.name}.</p>
              {/* O mesmo texto do modelo "Confirmação" da Aprazzo, pronto para o dono enviar. */}
              <div className="mt-3 rounded-xl bg-muted p-3 text-sm motion-safe:animate-bubble-in motion-safe:[animation-delay:0.5s]">
                <p className="mb-1 flex items-center gap-1.5 text-caption font-semibold text-success">
                  <MessageCircle className="size-3.5" aria-hidden />
                  Confirmação pronta para enviar no WhatsApp
                </p>
                <p className="text-muted-foreground">
                  Olá! Seu horário em Barbearia Exemplo está confirmado: {service.name.toLowerCase()} com Bruno, quinta às {time}.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const demoPrimary = cn(
  landingButton.base,
  "flex-auto bg-brand-cover text-on-brand hover:bg-brand-deep disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
);
const demoBack = cn(landingButton.base, "flex-auto bg-muted text-foreground hover:bg-border");

function DemoNav({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 flex flex-wrap gap-2.5">{children}</div>;
}

function AgendaEvent({ start, end, title, sub, tone }: { start: string; end: string; title: string; sub: string; tone: "busy" | "new" }) {
  return (
    <div
      style={eventBox(start, end)}
      className={cn(
        "absolute inset-x-2 flex items-baseline gap-1.5 overflow-hidden rounded-[10px] border px-2.5 py-1.5 text-[13px] leading-snug whitespace-nowrap",
        tone === "busy" ? "border-border bg-muted" : "border-primary bg-primary text-primary-foreground shadow-cta motion-safe:animate-ev-in",
      )}
    >
      <span className="font-bold tabular-nums">{start}</span>
      <b className="truncate font-semibold">{title}</b>
      <small className={cn("truncate", tone === "busy" ? "text-muted-foreground" : "text-primary-foreground/80")}>{sub}</small>
    </div>
  );
}

/** Convite logo depois da demonstração. */
export function AfterDemo() {
  return (
    <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3.5">
      <p className="max-w-[46ch] text-on-brand-muted">
        Gostou do caminho? Na conversa, mostramos a Aprazzo com os serviços e profissionais do seu negócio.
      </p>
      <WhatsAppCta section="demo" variant="light" />
    </div>
  );
}
