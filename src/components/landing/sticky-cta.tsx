"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import { WhatsAppCta } from "./landing-links";

/**
 * Botão fixo no rodapé do celular. Aparece depois que o botão do hero sai da tela e
 * some durante a demonstração, o plano Solo e a chamada final (nunca cobre os controles
 * delas nem fica ao lado de outro botão de WhatsApp).
 */
export function StickyCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const seen: Record<string, boolean> = { "hero-cta": true, "como-funciona": false, solo: false, final: false };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) seen[entry.target.id] = entry.isIntersecting;
      setShow(!seen["hero-cta"] && !seen["como-funciona"] && !seen.solo && !seen.final);
    });
    for (const id of Object.keys(seen)) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div
      aria-hidden={!show}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 border-t bg-background/94 px-5 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] backdrop-blur-md transition-transform duration-300 ease-brand md:hidden",
        show ? "translate-y-0" : "translate-y-[110%]",
      )}
    >
      <WhatsAppCta section="sticky-mobile" className="w-full" tabIndex={show ? 0 : -1} />
    </div>
  );
}
