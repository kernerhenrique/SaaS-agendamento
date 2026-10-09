import type { ReactNode } from "react";
import Link from "next/link";
import { Link2 } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { BRAND, LEGAL } from "@/config/brand";
import { formatPhoneBR } from "@/lib/phone";
import { cn } from "@/lib/utils";

import { SlotPattern } from "./hero";
import { LoginLink, WhatsAppCta, WhatsAppTextLink } from "./landing-links";
import { Reveal } from "./reveal";

/** Título de seção (h2) com subtítulo opcional. */
export function SectionHeading({ id, title, children, center, onDark }: { id: string; title: string; children?: ReactNode; center?: boolean; onDark?: boolean }) {
  return (
    <div className={cn("max-w-160", center && "mx-auto text-center")}>
      <h2 id={id} className="font-heading text-[clamp(1.875rem,4.2vw,2.875rem)] leading-[1.06] font-bold tracking-tight text-balance">
        {title}
      </h2>
      {children ? <p className={cn("mt-3.5 text-lg", onDark ? "text-on-brand-muted" : "text-muted-foreground")}>{children}</p> : null}
    </div>
  );
}

const STEPS = [
  {
    title: "Chame no WhatsApp",
    text: "Conte como o seu negócio funciona hoje: quantos profissionais, quais serviços e como os clientes marcam horário.",
    visual: (
      <span className="ml-auto max-w-58 rounded-xl rounded-br-sm bg-success/15 px-3 py-2 text-[13.5px] leading-snug shadow-xs">
        Olá! Vi o site e quero conhecer a Aprazzo.
      </span>
    ),
  },
  {
    title: "Veja a Aprazzo com a sua cara",
    text: "Montamos uma demonstração com o nome, a cor e os serviços do seu negócio, para você testar antes de decidir.",
    visual: (
      <div className="grid w-full grid-cols-3 content-center gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <i key={i} className={cn("h-5.5 rounded-md border", i === 2 || i === 4 ? "border-primary/40 bg-primary-soft" : "bg-card")} />
        ))}
      </div>
    ),
  },
  {
    title: "Receba tudo pronto",
    text: "Combinado o plano, configuramos serviços, equipe e horários. Em até 2 dias úteis você recebe o link para colocar na bio do Instagram.",
    visual: (
      <span className="flex items-center gap-2.5">
        <span className="flex size-8.5 items-center justify-center rounded-full bg-brand-cover text-on-brand">
          <Link2 className="size-4.5" strokeWidth={2.6} />
        </span>
        <b className="text-[15px]">aprazzo.com.br/seu-negocio</b>
      </span>
    ),
  },
] as const;

export function HowToStart() {
  return (
    <section id="comecar" aria-labelledby="h-start" className="scroll-mt-20 py-18 lg:py-28">
      <div className="mx-auto max-w-290 px-5">
        <SectionHeading id="h-start" title="Como começar">
          Sem compromisso: tudo começa com uma conversa.
        </SectionHeading>
        <ol className="mt-10 grid gap-4 min-[900px]:grid-cols-3 min-[900px]:gap-6">
          {STEPS.map((step, i) => (
            <Reveal as="li" key={step.title} delayMs={i * 80} className="relative rounded-2xl border bg-card px-4 pt-4 pb-6">
              <span
                aria-hidden
                className="absolute top-5 left-5 z-1 flex size-7.5 items-center justify-center rounded-full bg-brand-cover font-heading text-[15px] font-bold text-on-brand"
              >
                {i + 1}
              </span>
              <div aria-hidden className="mb-4.5 flex h-23 items-center justify-center rounded-xl bg-background py-3 pr-3 pl-12">
                {step.visual}
              </div>
              <h3 className="px-2 font-heading text-[21px] leading-tight font-bold tracking-tight">
                <span className="sr-only">Passo {i + 1}: </span>
                {step.title}
              </h3>
              <p className="mt-2 px-2 text-muted-foreground">{step.text}</p>
            </Reveal>
          ))}
        </ol>
        <div className="mt-8">
          <WhatsAppCta section="como-comecar" />
        </div>
      </div>
    </section>
  );
}

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: "Como a Aprazzo funciona?",
    a: "É um sistema online para negócios com hora marcada. Seus clientes agendam pela página do seu negócio; você acompanha a agenda de cada profissional, envia lembretes pelo WhatsApp, guarda o histórico dos clientes, registra os recebimentos e consulta relatórios.",
  },
  {
    q: "Preciso configurar tudo sozinho?",
    a: "Não. Nós configuramos seus serviços, sua equipe, seus horários e a sua marca, e entregamos pronto, com um treinamento rápido e o manual de uso. Depois, você ajusta o que quiser pelo painel.",
  },
  {
    q: "Como os meus clientes fazem o agendamento?",
    a: "Pelo link da página do seu negócio, no celular. O cliente escolhe o serviço, o profissional (ou \"sem preferência\") e um horário livre, e informa nome e WhatsApp. Não precisa instalar aplicativo nem criar conta, e o atendimento já aparece na sua agenda.",
  },
  {
    q: "E se o cliente precisar cancelar ou remarcar?",
    a: "Ele mesmo faz, pelo link que recebe ao agendar, e o horário fica livre para outra pessoa. Você define até quantas horas antes isso é permitido e recebe um aviso por e-mail a cada mudança.",
  },
  {
    q: "Funciona no celular?",
    a: "Sim. A página de agendamento e o painel funcionam no navegador do celular, do tablet ou do computador. O painel também pode ser instalado na tela inicial do celular, como um aplicativo.",
  },
  {
    q: "Dá para usar com mais de um profissional? E sozinho?",
    a: "Os dois. Cada profissional tem a sua agenda e, se você quiser, o próprio acesso, vendo só os atendimentos e clientes dele; financeiro e relatórios ficam com você. Quem atende sozinho usa do mesmo jeito.",
  },
  {
    q: "A Aprazzo recebe pagamentos dos meus clientes?",
    a: "Não. Seus clientes continuam pagando direto para você, por Pix, cartão ou dinheiro. Na Aprazzo, você registra o que recebeu, inclusive sinal e pagamento em partes, para ter o controle do dia e do mês. Ela não é maquininha, banco nem sistema contábil.",
  },
  {
    q: "Meus dados ficam seguros?",
    a: "Sim. A conexão é criptografada, as senhas ficam guardadas de forma cifrada e os dados de cada negócio ficam separados, num banco de dados em São Paulo. Os dados dos seus clientes são seus, tratados conforme a LGPD, e você recebe uma cópia se um dia decidir sair.",
  },
  {
    q: "Quanto custa?",
    a: "Depende do tamanho e da rotina do seu negócio. Na conversa pelo WhatsApp, apresentamos os planos com tudo explicado: a implantação e a mensalidade.",
  },
  {
    q: "Como funciona o suporte?",
    a: "Pelo WhatsApp, em horário comercial, com quem conhece o seu negócio desde a implantação.",
  },
  {
    q: "Já sou cliente. Onde eu entro?",
    a: (
      <>
        Pelo botão{" "}
        <LoginLink className="font-semibold text-primary underline underline-offset-3">Entrar</LoginLink>, no topo da página. Ele leva ao
        painel da Aprazzo.
      </>
    ),
  },
];

/** Dúvidas frequentes, centralizadas; `<details>` nativo (teclado e leitor de tela de graça). */
export function Faq() {
  return (
    <section id="duvidas" aria-labelledby="h-faq" className="scroll-mt-20 pb-18 lg:pb-28">
      <div className="mx-auto max-w-290 px-5">
        <SectionHeading id="h-faq" title="Dúvidas frequentes" center />
        <div className="mx-auto mt-9 max-w-205 border-t">
          {FAQ.map((item) => (
            <details key={item.q} className="group border-b">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg leading-snug font-semibold focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden
                  className="relative size-8 shrink-0 rounded-full bg-muted transition-colors duration-200 group-open:bg-primary-soft before:absolute before:top-1/2 before:left-1/2 before:h-0.5 before:w-3 before:-translate-1/2 before:rounded-full before:bg-foreground after:absolute after:top-1/2 after:left-1/2 after:h-0.5 after:w-3 after:-translate-1/2 after:rotate-90 after:rounded-full after:bg-foreground after:transition-transform after:duration-250 group-open:after:rotate-0"
                />
              </summary>
              <div className="max-w-[68ch] pr-12 pb-5.5 text-muted-foreground">{item.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section id="final" aria-labelledby="h-final" className="pb-18 lg:pb-28">
      <div className="mx-auto max-w-290 px-5">
        <div className="relative overflow-hidden rounded-4xl bg-brand-cover px-6 py-11 text-on-brand md:px-16 md:py-18">
          <SlotPattern className="-top-2.5 -right-5 hidden w-[40%] grid-cols-3 opacity-90 md:grid" cells={12} lit={[1, 5, 6]} />
          <h2 id="h-final" className="relative max-w-[20ch] font-heading text-[clamp(2rem,5vw,3.375rem)] leading-[1.04] font-bold tracking-tight text-balance">
            Menos tempo organizando horários, mais tempo atendendo.
          </h2>
          <p className="relative mt-4 max-w-[46ch] text-[19px] text-on-brand-muted">
            Agenda, clientes, lembretes e recebimentos no mesmo lugar, entregues prontos com a sua marca. Chame no WhatsApp e
            veja a Aprazzo com a rotina do seu negócio.
          </p>
          <div className="relative mt-8">
            <WhatsAppCta section="final" variant="light" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  const phone = formatPhoneBR(LEGAL.contactWhatsapp);
  return (
    <footer className="pt-12 pb-10 text-[15px] text-muted-foreground">
      <div className="mx-auto grid max-w-290 gap-6 px-5 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <a href="#inicio" aria-label={`${BRAND.name}, voltar ao início`} className="inline-block rounded-md">
            <BrandLogo />
          </a>
          <p className="mt-3">Agendamento e gestão para quem vive de horário marcado.</p>
          <p className="mt-1.5">
            WhatsApp:{" "}
            <WhatsAppTextLink section="footer" className="text-foreground underline underline-offset-3">
              {phone}
            </WhatsAppTextLink>
            {" · "}E-mail:{" "}
            <a href="mailto:contato@aprazzo.com.br" className="text-foreground underline underline-offset-3">
              contato@aprazzo.com.br
            </a>
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          <li>
            <LoginLink className="text-foreground underline underline-offset-3" />
          </li>
          <li>
            <Link href="/termos" className="text-foreground underline underline-offset-3">
              Termos de uso
            </Link>
          </li>
          <li>
            <Link href="/privacidade" className="text-foreground underline underline-offset-3">
              Política de privacidade
            </Link>
          </li>
          <li>
            © {new Date().getFullYear()} {BRAND.name}
          </li>
        </ul>
      </div>
    </footer>
  );
}
