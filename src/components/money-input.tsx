"use client";

import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { caretNeedsMove, digitsToCents, formatCentsInput } from "@/lib/currency";
import { cn } from "cn";

/**
 * Campo de valor em reais com máscara pt-BR ("R$ 1.234,56"). Guarda
 * centavos inteiros (padrão do projeto: dinheiro nunca em float). A digitação
 * funciona como em maquininha: os dígitos entram pela direita, por isso o
 * cursor fica sempre no fim (com ele no meio, "2000" digitado em "0,00"
 * virava R$ 20.000,00).
 */
export function MoneyInput({
  valueCents,
  onValueChange,
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  valueCents: number;
  onValueChange: (cents: number) => void;
}) {
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
        R$
      </span>
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        className="pl-9 text-right tabular-nums"
        value={formatCentsInput(valueCents)}
        onChange={(event) => onValueChange(digitsToCents(event.target.value))}
        onSelect={(event) => keepCaretAtEnd(event.currentTarget)}
        onFocus={(event) => keepCaretAtEnd(event.currentTarget)}
      />
    </div>
  );
}

/** Leva o cursor para o fim; a seleção do texto inteiro (para substituir) é mantida. */
function keepCaretAtEnd(input: HTMLInputElement) {
  const move = () => {
    const end = input.value.length;
    if (caretNeedsMove(input.selectionStart, input.selectionEnd, end)) input.setSelectionRange(end, end);
  };
  move();
  // No toque o navegador posiciona o cursor depois do evento: confere de novo no próximo quadro.
  requestAnimationFrame(() => {
    if (document.activeElement === input) move();
  });
}
