import { Settings } from "lucide-react";

import { ComingSoon } from "@/components/admin/coming-soon";

export const metadata = { title: "Configurações" };

export default function ConfiguracoesPage() {
  return (
    <ComingSoon
      title="Configurações"
      icon={Settings}
      description="Identidade do negócio (logo, cor, capa), contato, horário de funcionamento, regras de reserva e senha."
    />
  );
}
