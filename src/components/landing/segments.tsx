"use client";

import { useRef, useState, type KeyboardEvent } from "react";

import { cn } from "@/lib/utils";

import { track } from "./landing-config";

type SegmentId = "barbearia" | "estudio" | "clinica" | "salao" | "outro";

const SEGMENTS: Record<SegmentId, { chip: string; name: string; initial: string; line: string; services: [string, string, string][]; pros: string[] }> = {
  barbearia: {
    chip: "Barbearia",
    name: "Barbearia Exemplo",
    initial: "B",
    line: "Cada barbeiro com a sua agenda, e o cliente marca o corte sem te chamar para perguntar horário.",
    services: [
      ["Corte de cabelo", "40 min", "R$ 50"],
      ["Corte + barba", "1 h", "R$ 80"],
      ["Barba", "30 min", "R$ 35"],
    ],
    pros: ["Bruno", "Diego", "Léo"],
  },
  estudio: {
    chip: "Estúdio de tatuagem",
    name: "Estúdio Exemplo",
    initial: "E",
    line: "Sessões longas e avaliações rápidas no mesmo calendário, com preço \"a partir de\" para cada projeto.",
    services: [
      ["Avaliação de projeto", "30 min", "R$ 50"],
      ["Sessão de tatuagem", "3 h", "a partir de R$ 400"],
      ["Retoque", "1 h", "R$ 120"],
    ],
    pros: ["Carla", "Nina"],
  },
  clinica: {
    chip: "Clínica ou consultório",
    name: "Clínica Exemplo",
    initial: "C",
    line: "As consultas de vários profissionais numa visão só, com o cadastro de cada paciente à mão.",
    services: [
      ["Consulta", "50 min", "R$ 200"],
      ["Retorno", "30 min", "R$ 120"],
      ["Avaliação inicial", "1 h", "R$ 250"],
    ],
    pros: ["Dra. Marina", "Dr. Paulo"],
  },
  salao: {
    chip: "Salão de beleza",
    name: "Salão Exemplo",
    initial: "S",
    line: "Serviços de durações diferentes, cada um no seu lugar da agenda, e o dia fechado sem conta no papel.",
    services: [
      ["Escova", "45 min", "R$ 70"],
      ["Coloração", "2 h", "R$ 220"],
      ["Manicure", "40 min", "R$ 45"],
    ],
    pros: ["Luana", "Bia", "Rô"],
  },
  outro: {
    chip: "Outro negócio",
    name: "Seu Negócio",
    initial: "S",
    line: "Aulas, personal, pet shop, estética: se o cliente marca horário, a Aprazzo organiza. Também para quem atende sozinho.",
    services: [
      ["Seu serviço principal", "1 h", "R$ —"],
      ["Outro serviço", "30 min", "R$ —"],
      ["Avaliação", "20 min", "R$ —"],
    ],
    pros: ["Você", "Equipe"],
  },
};
const ORDER = Object.keys(SEGMENTS) as SegmentId[];

/** Escolha um tipo de negócio e veja a página de agendamento mudar (serviços e equipe). */
export function Segments() {
  const [active, setActive] = useState<SegmentId>("barbearia");
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const seg = SEGMENTS[active];

  const select = (id: SegmentId, focus = false) => {
    setActive(id);
    if (focus) chipRefs.current[id]?.focus();
    track("segment_view", { segment: id });
  };
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    select(ORDER[(index + delta + ORDER.length) % ORDER.length], true);
  };

  return (
    <div className="mx-auto grid max-w-290 gap-9 px-5 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] min-[900px]:items-center min-[900px]:gap-16">
      <div>
        <h2 id="h-seg" className="max-w-[15ch] font-heading text-[clamp(1.875rem,4.2vw,2.875rem)] leading-[1.06] font-bold tracking-tight text-balance">
          Para qualquer negócio que trabalha com agendamento
        </h2>
        <p className="mt-3.5 max-w-[46ch] text-lg text-muted-foreground">
          A página de agendamento fica com a cara do seu negócio: seus serviços, sua equipe, sua marca e as palavras do seu ramo.
          Escolha um exemplo:
        </p>
        <div role="radiogroup" aria-label="Exemplos de negócio" className="mt-6 flex flex-wrap gap-2.5">
          {ORDER.map((id, i) => (
            <button
              key={id}
              ref={(el) => {
                chipRefs.current[id] = el;
              }}
              type="button"
              role="radio"
              aria-checked={active === id}
              tabIndex={active === id ? 0 : -1}
              onClick={() => select(id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "min-h-11 cursor-pointer rounded-full border-[1.5px] px-4.5 text-sm font-semibold transition-[background-color,border-color,color,transform] duration-150 ease-brand active:scale-[0.97] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                active === id ? "border-brand-cover bg-brand-cover text-on-brand" : "border-input bg-card hover:border-primary",
              )}
            >
              {SEGMENTS[id].chip}
            </button>
          ))}
        </div>
        <p aria-live="polite" className="mt-5 min-h-[3.2em] max-w-[46ch] border-l-3 border-brand-mint pl-3.5 text-[17px]">
          {seg.line}
        </p>
      </div>

      <figure
        aria-label="Ilustração: página de agendamento do negócio escolhido"
        className="relative m-0 flex justify-center overflow-hidden rounded-4xl bg-primary-soft px-5 pt-9 pb-11"
      >
        <span aria-hidden className="absolute -right-10 -bottom-15 size-65 rounded-full bg-primary/12" />
        <div aria-hidden className="relative w-[min(100%,330px)] rounded-[34px] border bg-card px-4.5 pt-5.5 pb-5 text-card-foreground shadow-xl">
          <div key={`h-${active}`} className="flex items-center gap-3 border-b pb-3.5 motion-safe:animate-swap">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-foreground font-heading text-xl font-bold text-background">
              {seg.initial}
            </span>
            <div>
              <b className="block font-heading text-[17px] leading-tight font-bold tracking-tight">{seg.name}</b>
              <small className="text-[12.5px] text-muted-foreground">Agende pelo celular, sem baixar app</small>
            </div>
          </div>
          <div className="mt-4 mb-2 text-[13px] font-semibold text-muted-foreground">Escolha o serviço</div>
          <div key={`s-${active}`} className="grid gap-2 motion-safe:animate-swap">
            {seg.services.map(([name, dur, price], i) => (
              <div
                key={name}
                className={cn("grid grid-cols-[1fr_auto] gap-x-2.5 rounded-xl border-[1.5px] px-3 py-2.5 text-sm", i === 0 && "border-primary bg-primary-soft")}
              >
                <b className="font-semibold">{name}</b>
                <span className="row-span-2 self-center text-right font-bold tabular-nums">{price}</span>
                <small className="text-[12.5px] text-muted-foreground">{dur}</small>
              </div>
            ))}
          </div>
          <div className="mt-4 mb-2 text-[13px] font-semibold text-muted-foreground">Com quem?</div>
          <div key={`p-${active}`} className="flex gap-2.5 motion-safe:animate-swap">
            {seg.pros.map((p, i) => (
              <div key={p} className="flex flex-col items-center gap-1 text-xs font-semibold">
                <i className={cn("flex size-10.5 items-center justify-center rounded-full text-sm font-bold not-italic", i === 0 ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary")}>
                  {p.replace(/^Dra?\. /, "")[0]}
                </i>
                {p}
              </div>
            ))}
          </div>
          <div className="mt-4.5 rounded-xl bg-primary py-3 text-center text-sm font-semibold text-primary-foreground">Escolher horário</div>
        </div>
        <figcaption className="absolute bottom-3.5 left-5 text-caption font-semibold text-primary">Ilustração com dados fictícios</figcaption>
      </figure>
    </div>
  );
}
