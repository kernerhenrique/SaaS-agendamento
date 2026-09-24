"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

const THEME_STORAGE_KEY = "theme";

function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
  } catch {
    // localStorage pode estar indisponível (modo privado, storage bloqueado);
    // o tema só deixa de persistir entre visitas, sem quebrar a página.
  }
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Só pode ler a classe real do <html> depois de montar no cliente (o
    // script inline no <head> já a definiu antes da hidratação); fazer isso
    // durante a renderização quebraria a paridade servidor/cliente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
  }

  return (
    <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Alternar tema claro/escuro">
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
