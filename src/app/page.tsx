import Link from "next/link";
import { CalendarCheck, Users, Wallet } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import { BRAND } from "@/config/brand";

const HIGHLIGHTS = [
  { icon: CalendarCheck, title: "Reserva pelo link", text: "Seu cliente agenda pelo celular, sem baixar app nem criar conta." },
  { icon: Users, title: "Agenda da equipe", text: "Cada profissional com a própria agenda, e o dono vendo tudo." },
  { icon: Wallet, title: "Financeiro e comissões", text: "Recebimentos, a receber e comissão de cada um, sem planilha." },
] as const;

/** Página inicial do domínio: apresentação curta da Aprazzo e acesso ao painel. */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <BrandLogo />
        <Link href="/admin/login" className={buttonVariants({ variant: "outline" })}>
          Entrar
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-4 py-12 sm:px-6">
        <div className="flex max-w-2xl flex-col gap-4">
          <h1 className="text-display font-semibold tracking-tight text-balance">{BRAND.tagline}</h1>
          <p className="text-lg text-muted-foreground text-pretty">
            Página de reservas com a cara do seu negócio, agenda da equipe, clientes, mensagens pelo WhatsApp e
            financeiro, entregue pronta para usar.
          </p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-3">
          {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex flex-col gap-2 rounded-lg border bg-card p-5">
              <Icon className="size-5 text-primary" aria-hidden />
              <h2 className="text-section-title font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mx-auto flex w-full max-w-5xl flex-wrap justify-between gap-2 px-4 py-6 text-caption text-muted-foreground sm:px-6">
        <span>
          © {new Date().getFullYear()} {BRAND.name}
        </span>
        <span>
          <Link href="/privacidade" className="underline-offset-4 hover:underline">
            Privacidade
          </Link>{" "}
          ·{" "}
          <Link href="/termos" className="underline-offset-4 hover:underline">
            Termos
          </Link>
        </span>
      </footer>
    </main>
  );
}
