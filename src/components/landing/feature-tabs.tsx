"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Check, MessageCircle, Search } from "lucide-react";

import { cn } from "@/lib/utils";

import { track } from "./landing-config";

type TabId = "agenda" | "clientes" | "whatsapp" | "financeiro" | "relatorios";

const TABS: { id: TabId; label: string; title: string; text: string; bullets: string[] }[] = [
  {
    id: "agenda",
    label: "Agenda",
    title: "Veja o dia inteiro antes de abrir as portas",
    text: "Quem vem, em que horário e com qual profissional, numa tela só. O que o cliente marca pela página já entra na agenda, sem você digitar de novo.",
    bullets: [
      "Encaixar um cliente vendo onde ainda há horário livre",
      "Remarcar arrastando o horário, no computador",
      "Bloquear almoço, folga e feriado sem confusão",
    ],
  },
  {
    id: "clientes",
    label: "Clientes",
    title: "Encontre qualquer cliente em segundos",
    text: "Cada reserva cria ou atualiza o cadastro pelo WhatsApp do cliente, sem duplicar. Na hora de atender, você sabe quantas vezes ele veio e o que anotou da última vez.",
    bullets: [
      "Buscar pelo nome, telefone ou etiqueta",
      "Anotar preferências que só a equipe vê",
      "Ver quem não volta há mais de 60 dias",
    ],
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    title: "Menos faltas com lembrete no WhatsApp",
    text: "A Aprazzo prepara a confirmação, o lembrete da véspera e o agradecimento com os dados de cada cliente. Você envia pelo seu próprio WhatsApp, com um toque.",
    bullets: [
      "Lista dos lembretes de amanhã, com o que já foi enviado",
      "O link na mensagem deixa o cliente cancelar ou remarcar sozinho",
      "Textos que você edita com o jeito do seu negócio",
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    title: "Saiba quanto entrou e quanto é de cada um",
    text: "Registre cada recebimento, seja Pix, cartão ou dinheiro, e acompanhe o total do dia e do mês. O cliente continua pagando direto para você: a Aprazzo só organiza o registro.",
    bullets: [
      "Fechar o dia sabendo o que foi recebido",
      "Ver o que ainda falta receber, com sinal e pagamento em partes",
      "Comissão de cada profissional calculada sozinha",
    ],
  },
  {
    id: "relatorios",
    label: "Relatórios",
    title: "Entenda como o seu negócio está indo",
    text: "Atendimentos, faturamento, profissionais, serviços e clientes por período, sempre comparados com o período anterior. Decida horários, folgas e promoções olhando o que de fato aconteceu.",
    bullets: ["Descobrir os dias de mais movimento", "Comparar com o mês anterior", "Exportar para o Excel quando precisar"],
  },
];

/** Recursos por área, em abas (setas, Home e End trocam de aba pelo teclado). */
export function FeatureTabs() {
  const [active, setActive] = useState<TabId>("agenda");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const select = (id: TabId, focus = false) => {
    setActive(id);
    if (focus) tabRefs.current[id]?.focus();
    track("tab_view", { tab: id });
  };
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const last = TABS.length - 1;
    const next =
      event.key === "ArrowRight" ? (index + 1) % TABS.length : event.key === "ArrowLeft" ? (index - 1 + TABS.length) % TABS.length : event.key === "Home" ? 0 : event.key === "End" ? last : null;
    if (next === null) return;
    event.preventDefault();
    select(TABS[next].id, true);
  };

  return (
    <>
      <div
        role="tablist"
        aria-label="Áreas da Aprazzo"
        className="mt-9 flex w-max max-w-full gap-1.5 rounded-full bg-muted p-1.5 max-sm:w-full max-sm:flex-wrap max-sm:justify-center max-sm:rounded-3xl"
      >
        {TABS.map((tab, i) => (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[tab.id] = el;
            }}
            role="tab"
            id={`t-${tab.id}`}
            aria-controls={`p-${tab.id}`}
            aria-selected={active === tab.id}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => select(tab.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "min-h-11 shrink-0 cursor-pointer rounded-full px-4.5 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none max-sm:flex-[1_1_30%] max-sm:px-3",
              active === tab.id ? "bg-card text-foreground shadow-md" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-7">
        {TABS.map((tab) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`p-${tab.id}`}
            aria-labelledby={`t-${tab.id}`}
            tabIndex={0}
            hidden={active !== tab.id}
            className="grid gap-7 outline-none lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-14"
          >
            {active === tab.id ? (
              <>
                <div className="motion-safe:animate-pane-in">
                  <h3 className="font-heading text-[clamp(1.625rem,3.2vw,2.125rem)] leading-tight font-bold tracking-tight">{tab.title}</h3>
                  <p className="mt-3 max-w-[48ch] text-lg text-muted-foreground">{tab.text}</p>
                  <ul className="mt-5 grid gap-2.5">
                    {tab.bullets.map((b) => (
                      <li key={b} className="grid grid-cols-[22px_1fr] gap-2.5">
                        <Check className="mt-1 size-5 text-primary" strokeWidth={2.6} aria-hidden />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <Screen>{SCREENS[tab.id]}</Screen>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <div aria-hidden className="relative overflow-hidden rounded-2xl border bg-card p-4.5 text-card-foreground shadow-lg motion-safe:animate-screen-in">
      <span className="absolute top-3 right-3 rounded-full bg-muted px-2 py-0.5 text-[11.5px] font-semibold text-muted-foreground">
        Tela ilustrativa
      </span>
      {children}
    </div>
  );
}

const ScreenTitle = ({ children }: { children: ReactNode }) => <h4 className="mb-3.5 font-heading text-[17px] leading-tight font-bold">{children}</h4>;

const AGENDA_ROWS: [string, (string | null)[]][] = [
  ["09:00", ["Rafael · Corte", null, "Tiago · Barba"]],
  ["10:00", [null, "Juliana · Corte + barba", "livre"]],
  ["11:00", ["Marcos · Barba", null, null]],
  ["12:00", [null, null, "Helena · Corte"]],
  ["13:00", ["André · Corte", "livre", null]],
];

const SCREENS: Record<TabId, ReactNode> = {
  agenda: (
    <>
      <ScreenTitle>Agenda · quinta-feira</ScreenTitle>
      <div className="grid grid-cols-[44px_repeat(3,minmax(0,1fr))] text-[12.5px]">
        <div />
        {["Bruno", "Diego", "Léo"].map((p) => (
          <div key={p} className="border-b px-1.5 pt-1.5 pb-2.5 text-center font-semibold">
            {p}
          </div>
        ))}
        {AGENDA_ROWS.map(([hour, cells]) => (
          <div key={hour} className="contents">
            <div className="h-11 py-1 text-muted-foreground tabular-nums">{hour}</div>
            {cells.map((c, i) => (
              <div key={i} className="h-11 border-l p-0.75">
                {c ? (
                  <span
                    className={cn(
                      "block h-full truncate rounded-lg px-1.5 py-1 text-xs leading-tight",
                      c === "livre" ? "bg-muted text-muted-foreground" : "bg-primary-soft",
                      c.includes("+") && "relative z-1 h-[200%]",
                    )}
                  >
                    {c === "livre" ? "Livre" : c}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  ),
  clientes: (
    <>
      <ScreenTitle>Clientes</ScreenTitle>
      <div className="mb-1.5 flex items-center gap-2 rounded-[10px] border-[1.5px] border-input px-3 py-2 text-sm text-muted-foreground">
        <Search className="size-4" />
        Buscar por nome, telefone ou etiqueta
      </div>
      {[
        ["BN", "Beatriz Nunes", "(27) 98877-3310", "VIP"],
        ["JC", "Juliana Costa", "(27) 99654-1022", null],
        ["RM", "Rafael Martins", "(27) 99812-4471", "Prefere manhã"],
      ].map(([ini, name, phone, tag]) => (
        <div key={name} className="grid grid-cols-[36px_1fr_auto] items-center gap-3 border-t py-2.5 text-sm">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-[13px] font-bold text-primary">{ini}</span>
          <div>
            <b className="font-semibold">{name}</b>
            <small className="block text-[12.5px] text-muted-foreground">{phone}</small>
          </div>
          {tag ? <span className="rounded-full bg-muted px-2 py-0.5 text-caption font-medium">{tag}</span> : <span />}
        </div>
      ))}
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-background p-3 text-center">
        {[
          ["8", "Atendimentos"],
          ["19 set", "Última visita"],
          ["0", "Faltas"],
        ].map(([v, l]) => (
          <div key={l}>
            <b className="block text-lg font-bold tabular-nums">{v}</b>
            <small className="text-caption text-muted-foreground">{l}</small>
          </div>
        ))}
      </div>
    </>
  ),
  whatsapp: (
    <>
      <ScreenTitle>Lembretes de amanhã</ScreenTitle>
      <div className="mb-3 flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">3 de 5 enviados</span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <span className="block h-full w-3/5 rounded-full bg-success" />
        </span>
      </div>
      {[
        ["09:00", "Rafael Martins", true],
        ["10:30", "Juliana Costa", true],
        ["14:00", "Beatriz Nunes", false],
      ].map(([t, n, sent]) => (
        <div key={String(n)} className="flex items-center gap-3 border-t py-2.5 text-sm">
          <b className="w-12 tabular-nums">{t}</b>
          <span className="flex-1 truncate">{n}</span>
          {sent ? (
            <span className="inline-flex items-center gap-1 text-caption font-semibold text-success">
              <Check className="size-3.5" strokeWidth={3} />
              Enviado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-cover px-3 py-1 text-caption font-semibold text-on-brand">
              <MessageCircle className="size-3.5" />
              Enviar
            </span>
          )}
        </div>
      ))}
      <div className="mt-3 ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-success/12 p-3 text-sm motion-safe:animate-bubble-in motion-safe:[animation-delay:0.35s]">
        Oi, Beatriz! Passando para lembrar do seu horário em Barbearia Exemplo: corte com Diego, amanhã às 14:00. Se não puder
        vir, cancele ou remarque por aqui: <span className="font-medium text-primary underline underline-offset-2">link do agendamento</span>
      </div>
    </>
  ),
  financeiro: (
    <>
      <ScreenTitle>Recebimentos</ScreenTitle>
      <div className="mb-3 grid grid-cols-2 gap-2.5">
        {[
          ["Recebido hoje", "R$ 640"],
          ["A receber", "R$ 180"],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl bg-background p-3">
            <small className="text-[12.5px] text-muted-foreground">{l}</small>
            <b className="mt-0.5 block text-[22px] font-bold tabular-nums">{v}</b>
          </div>
        ))}
      </div>
      {[
        ["Rafael Martins", "R$ 50", "Corte · Pix · 09:40", "Pago"],
        ["Juliana Costa", "R$ 80", "Corte + barba · Cartão · 12:30", "Pago"],
        ["Helena Prado", "R$ 50", "Corte · sinal de R$ 20 recebido", "Parcial"],
      ].map(([n, v, d, s]) => (
        <div key={n} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 border-t py-2.5 text-sm">
          <b className="font-semibold">{n}</b>
          <span className="text-right font-bold tabular-nums">{v}</span>
          <small className="text-[12.5px] text-muted-foreground">{d}</small>
          <span
            className={cn(
              "justify-self-end rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold",
              s === "Pago" ? "bg-success/12 text-success" : "bg-warning/12 text-warning",
            )}
          >
            {s}
          </span>
        </div>
      ))}
    </>
  ),
  relatorios: (
    <>
      <ScreenTitle>Atendimentos por dia · esta semana</ScreenTitle>
      <div className="flex h-37.5 items-end gap-2.5 border-b pt-1.5">
        {[45, 62, 40, 74, 92, 80].map((h, i) => (
          <i
            key={i}
            className="flex-1 origin-bottom rounded-t-md bg-primary motion-safe:animate-grow"
            style={{ height: `${h}%`, animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex gap-2.5 text-xs text-muted-foreground">
        {["seg", "ter", "qua", "qui", "sex", "sáb"].map((d) => (
          <span key={d} className="flex-1 text-center">
            {d}
          </span>
        ))}
      </div>
      <div className="mt-4 grid gap-2.5 text-sm">
        {[
          ["Bruno", 52, 100],
          ["Diego", 38, 73],
          ["Léo", 21, 40],
        ].map(([n, v, w]) => (
          <div key={n} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
            <span>{n}</span>
            <b>{v} atendimentos</b>
            <em className="col-span-2 h-2 overflow-hidden rounded-full bg-muted not-italic">
              <i className="block h-full rounded-full bg-chart-1" style={{ width: `${w}%` }} />
            </em>
          </div>
        ))}
      </div>
    </>
  ),
};
