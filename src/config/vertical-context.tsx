"use client";

import { createContext, useContext, type ReactNode } from "react";

import { getVertical, type VerticalPreset } from "./vertical";

const VerticalContext = createContext<VerticalPreset>(getVertical("generic"));

/** Recebe só a chave (serializável) do server component e resolve o preset no client. */
export function VerticalProvider({ verticalKey, children }: { verticalKey: string; children: ReactNode }) {
  return <VerticalContext.Provider value={getVertical(verticalKey)}>{children}</VerticalContext.Provider>;
}

export function useVertical(): VerticalPreset {
  return useContext(VerticalContext);
}
