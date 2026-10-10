"use client";

import { createContext, useContext, type ReactNode } from "react";

import { getVertical, type VerticalPreset } from "./vertical";

const VerticalContext = createContext<VerticalPreset>(getVertical("generic"));

/** Recebe só a chave (serializável) do server component e resolve o preset no client. */
/**
 * `solo` (plano Solo): desliga o que é de equipe no preset — hoje, a comissão. Assim
 * Financeiro, Relatórios e o cadastro escondem a comissão sem regra própria.
 */
export function VerticalProvider({ verticalKey, solo = false, children }: { verticalKey: string; solo?: boolean; children: ReactNode }) {
  const preset = getVertical(verticalKey);
  const value = solo ? { ...preset, features: { ...preset.features, commissions: false } } : preset;
  return <VerticalContext.Provider value={value}>{children}</VerticalContext.Provider>;
}

export function useVertical(): VerticalPreset {
  return useContext(VerticalContext);
}
