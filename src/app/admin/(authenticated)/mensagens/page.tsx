import { MessageCircle } from "lucide-react";

import { ComingSoon } from "@/components/admin/coming-soon";

export const metadata = { title: "Mensagens" };

export default function MensagensPage() {
  return (
    <ComingSoon
      title="Mensagens"
      icon={MessageCircle}
      description="Modelos de mensagem para WhatsApp (confirmação, lembrete, pós-atendimento) prontos para enviar com um toque."
    />
  );
}
