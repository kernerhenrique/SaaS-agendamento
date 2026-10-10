import type { Metadata } from "next";

import { AfterDemo, BookingDemo } from "@/components/landing/booking-demo";
import { FeatureTabs } from "@/components/landing/feature-tabs";
import { Hero } from "@/components/landing/hero";
import { LandingHeader } from "@/components/landing/landing-header";
import { Faq, FinalCta, HowToStart, LandingFooter, SectionHeading } from "@/components/landing/landing-sections";
import { Segments } from "@/components/landing/segments";
import { SoloPlan } from "@/components/landing/solo-plan";
import { StickyCta } from "@/components/landing/sticky-cta";

export const metadata: Metadata = {
  title: { absolute: "Aprazzo: agendamento online e gestão para negócios com hora marcada" },
  description:
    "Página de agendamento com a sua marca, agenda da equipe, lembretes no WhatsApp, cadastro de clientes e recebimentos em um só lugar. Entregue pronta para usar.",
};

/** Página de vendas da Aprazzo (aprazzo.com.br): também é a porta do painel ("Entrar"). */
export default function Home() {
  return (
    <>
      <a
        href="#conteudo"
        className="fixed top-3 left-3 z-100 -translate-y-20 rounded-lg bg-foreground px-3.5 py-2.5 text-background focus:translate-y-0"
      >
        Pular para o conteúdo
      </a>
      <LandingHeader />

      <main id="conteudo" className="flex-1 max-md:pb-21">
        <Hero />

        <section id="como-funciona" aria-labelledby="h-demo" className="scroll-mt-20 bg-brand-deep py-18 text-on-brand lg:py-28">
          <div className="mx-auto max-w-290 px-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-on-brand/12 px-3 py-1.5 text-[13px] font-semibold">
              <span className="size-2 rounded-full bg-brand-mint" aria-hidden />
              Demonstração com dados fictícios
            </span>
            <div className="mt-4">
              <SectionHeading id="h-demo" title="Faça um agendamento como o seu cliente faria" onDark>
                Escolha um serviço e um horário na página de agendamento. Ao confirmar, veja o atendimento entrar na agenda do
                profissional. É só uma simulação: nenhum dado é pedido e nada é marcado de verdade.
              </SectionHeading>
            </div>
            <BookingDemo />
            <AfterDemo />
          </div>
        </section>

        <section id="recursos" aria-labelledby="h-rec" className="scroll-mt-20 py-18 lg:py-28">
          <div className="mx-auto max-w-290 px-5">
            <SectionHeading id="h-rec" title="O que muda no dia a dia">
              Tudo conversa entre si: o que o cliente agenda aparece na agenda, fica no cadastro dele, gera o lembrete e entra
              nos relatórios.
            </SectionHeading>
            <FeatureTabs />
          </div>
        </section>

        <section aria-labelledby="h-seg" className="bg-card py-18 lg:py-28">
          <Segments />
        </section>

        <SoloPlan />

        <HowToStart />
        <Faq />
        <FinalCta />
      </main>

      <LandingFooter />
      <StickyCta />
    </>
  );
}
