"use client";

import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

import { LoginLink, WhatsAppCta } from "./landing-links";

const NAV = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#recursos", label: "Recursos" },
  { href: "#duvidas", label: "Dúvidas" },
] as const;

/** Cabeçalho fixo: ganha a linha de baixo só depois de rolar um pouco. */
export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-background/88 backdrop-blur-md backdrop-saturate-150 transition-colors",
        scrolled ? "border-border" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-17 max-w-290 items-center justify-between gap-4 px-5">
        <a href="#inicio" aria-label="Aprazzo, início" className="rounded-md">
          <BrandLogo />
        </a>
        <nav aria-label="Principal" className="flex items-center gap-2 md:gap-5">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:inline"
            >
              {item.label}
            </a>
          ))}
          <LoginLink className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ring-[1.5px] ring-input ring-inset transition-colors hover:bg-card focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" />
          <WhatsAppCta section="header" size="small" icon={false}>
            <span className="hidden md:inline">Conhecer pelo WhatsApp</span>
            <span className="md:hidden">WhatsApp</span>
          </WhatsAppCta>
        </nav>
      </div>
    </header>
  );
}
