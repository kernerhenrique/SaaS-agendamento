import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { BRAND, LEGAL } from "@/config/brand";
import { formatPhoneBR } from "@/lib/phone";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

/** Moldura das páginas /termos e /privacidade: marca, título, data, conteúdo e contato. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  const company = [LEGAL.companyName, LEGAL.cnpj ? `CNPJ ${LEGAL.cnpj}` : null].filter(Boolean).join(" · ");
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-6">
        <Link href="/" aria-label={`${BRAND.name}: página inicial`} className="w-fit">
          <BrandLogo />
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-page-title font-bold">{title}</h1>
          <p className="text-caption text-muted-foreground">Última atualização: {LEGAL.updatedAt}</p>
        </div>
      </header>

      <article className="flex flex-col gap-6 text-sm leading-relaxed [&_h2]:text-section-title [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_section]:flex [&_section]:flex-col [&_section]:gap-2 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
        {children}
      </article>

      <footer className="flex flex-col gap-1 border-t pt-6 text-caption text-muted-foreground">
        <p>
          Dúvidas ou pedidos sobre estes termos e sobre dados pessoais:{" "}
          <a href={buildWhatsAppUrl(LEGAL.contactWhatsapp)} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
            WhatsApp {formatPhoneBR(LEGAL.contactWhatsapp)}
          </a>
          .
        </p>
        {company ? <p>{company}</p> : null}
        <p>
          <Link href="/termos" className="underline-offset-4 hover:underline">
            Termos de uso
          </Link>{" "}
          ·{" "}
          <Link href="/privacidade" className="underline-offset-4 hover:underline">
            Política de privacidade
          </Link>
        </p>
      </footer>
    </main>
  );
}
