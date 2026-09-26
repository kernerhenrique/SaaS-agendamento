import { Wallet } from "lucide-react";

import { ComingSoon } from "@/components/admin/coming-soon";

export const metadata = { title: "Financeiro" };

export default function FinanceiroPage() {
  return (
    <ComingSoon
      title="Financeiro"
      icon={Wallet}
      description="Registro de pagamentos (PIX, dinheiro, cartão), recebido e a receber, comissões e exportação para o contador."
    />
  );
}
