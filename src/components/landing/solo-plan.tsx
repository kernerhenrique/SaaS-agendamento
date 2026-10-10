import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import { LANDING } from "./landing-config";
import { WhatsAppCta } from "./landing-links";
import { Reveal } from "./reveal";

const POINTS = [
  {
    title: "Agendamento em 3 toques",
    text: "Serviço, horário e os dados do cliente. Ele não precisa escolher com quem: é sempre com você.",
  },
  {
    title: "Sua agenda, do seu jeito",
    text: "Dias, horários e intervalo num lugar só. Médico, folga ou férias? Marque o período e a página não oferece esses horários.",
  },
  {
    title: "O negócio na palma da mão",
    text: "Lembretes no WhatsApp, o histórico de cada cliente e o que entrou no mês, sem caderno e sem planilha.",
  },
  {
    title: "Pronto para crescer",
    text: "Contratou alguém? É só mudar de plano: seus clientes e o seu histórico continuam, e o painel ganha as telas de equipe.",
  },
] as const;

/**
 * Plano Solo na página de vendas: para quem atende sozinho. A ilustração mostra a
 * reserva em 3 passos (sem a escolha do profissional), igual à página de verdade.
 */
export function SoloPlan() {
  return (
    <section id="solo" aria-labelledby="h-solo" className="scroll-mt-20 py-18 lg:py-28">
      <div className="mx-auto grid max-w-290 gap-10 px-5 min-[900px]:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] min-[900px]:items-center min-[900px]:gap-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-[13px] font-semibold text-primary">
            <span className="size-2 rounded-full bg-brand-cover" aria-hidden />
            Plano Solo
          </span>
          <h2
            id="h-solo"
            className="mt-4 max-w-[18ch] font-heading text-[clamp(1.875rem,4.2vw,2.875rem)] leading-[1.06] font-bold tracking-tight text-balance"
          >
            Trabalha sozinho? A Aprazzo também é para você.
          </h2>
          <p className="mt-3.5 max-w-[48ch] text-lg text-muted-foreground">
            Manicure, tatuador, personal, esteticista, terapeuta: quem atende sozinho cuida de tudo, da agenda ao caixa. O plano
            Solo é a Aprazzo do tamanho do seu negócio, sem telas de equipe e sem nada sobrando.
          </p>
          <ul className="mt-7 grid gap-4.5 sm:grid-cols-2">
            {POINTS.map((point, i) => (
              <Reveal as="li" key={point.title} delayMs={i * 60} className="flex gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-cover text-on-brand" aria-hidden>
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span>
                  <b className="block font-semibold">{point.title}</b>
                  <span className="text-[15px] text-muted-foreground">{point.text}</span>
                </span>
              </Reveal>
            ))}
          </ul>
          <div className="mt-8">
            <WhatsAppCta section="solo" message={LANDING.whatsappMessageSolo}>
              Quero conhecer o plano Solo
            </WhatsAppCta>
          </div>
        </div>

        <figure
          aria-label="Ilustração: agendamento em 3 passos no plano Solo"
          className="relative m-0 flex justify-center overflow-hidden rounded-4xl bg-brand-deep px-5 pt-9 pb-12"
        >
          <span aria-hidden className="absolute -top-14 -left-12 size-56 rounded-full bg-on-brand/8" />
          <div aria-hidden className="relative w-[min(100%,330px)] rounded-[34px] border bg-card px-4.5 pt-5.5 pb-5 text-card-foreground shadow-xl">
            <div className="flex items-center gap-3 border-b pb-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-foreground font-heading text-xl font-bold text-background">
                A
              </span>
              <div>
                <b className="block font-heading text-[17px] leading-tight font-bold tracking-tight">Ana Sobrancelhas</b>
                <small className="text-[12.5px] text-muted-foreground">Agende pelo celular, sem baixar app</small>
              </div>
            </div>

            <ol className="mt-4 grid grid-cols-3 gap-1.5 text-center text-[11.5px] font-semibold">
              {["Serviço", "Horário", "Seus dados"].map((step, i) => (
                <li key={step} className="flex flex-col items-center gap-1">
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-[11px]",
                      i < 1 ? "bg-brand-cover text-on-brand" : i === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {i < 1 ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={i === 2 ? "text-muted-foreground" : undefined}>{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-4 grid grid-cols-[1fr_auto] gap-x-2.5 rounded-xl border-[1.5px] border-primary bg-primary-soft px-3 py-2.5 text-sm">
              <b className="font-semibold">Design de sobrancelha</b>
              <span className="row-span-2 self-center text-right font-bold tabular-nums">R$ 60</span>
              <small className="text-[12.5px] text-muted-foreground">40 min · com Ana</small>
            </div>

            <div className="mt-4 mb-2 text-[13px] font-semibold text-muted-foreground">Quinta-feira, 16 de outubro</div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm font-semibold tabular-nums">
              {["09:00", "10:30", "11:15", "14:00", "15:30", "17:00"].map((time) => (
                <span
                  key={time}
                  className={cn("rounded-lg border-[1.5px] py-2", time === "10:30" ? "border-primary bg-primary text-primary-foreground" : "bg-card")}
                >
                  {time}
                </span>
              ))}
            </div>
            <div className="mt-4.5 rounded-xl bg-primary py-3 text-center text-sm font-semibold text-primary-foreground">Continuar</div>
          </div>
          <figcaption className="absolute bottom-3.5 left-5 text-caption font-semibold text-on-brand-muted">
            Ilustração com dados fictícios
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
