"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Revela o conteúdo ao entrar na tela (sobe 16 px e aparece). Só esconde quando o JS
 * rodou (`js:`) e o aparelho não pede menos movimento (`motion-safe:`): sem JS ou com
 * "reduzir movimento", o conteúdo fica visível desde o início.
 */
export function Reveal({
  as: Tag = "div",
  delayMs = 0,
  className,
  children,
}: {
  as?: ElementType;
  delayMs?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-shown={shown ? "" : undefined}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={cn(
        "transition-[opacity,transform] duration-600 ease-brand js:motion-safe:translate-y-4 js:motion-safe:opacity-0 js:motion-safe:data-shown:translate-y-0 js:motion-safe:data-shown:opacity-100",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
