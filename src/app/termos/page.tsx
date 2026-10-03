import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/legal-page";
import { BRAND } from "@/config/brand";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: `Regras de uso da ${BRAND.name} para quem agenda e para os negócios.`,
};

/** Termos de uso. Texto-base: revisar com advogado; o contrato comercial com cada negócio prevalece. */
export default function TermsPage() {
  const name = BRAND.name;
  return (
    <LegalPage title="Termos de uso">
      <p>
        Estes termos valem para quem usa a {name}: quem agenda um horário pela página de um negócio e os negócios (dono e
        equipe) que usam o painel. Ao usar a plataforma, você concorda com eles e com a{" "}
        <Link href="/privacidade" className="text-primary underline-offset-4 hover:underline">
          Política de privacidade
        </Link>
        .
      </p>

      <section>
        <h2>1. O que a {name} faz</h2>
        <p>
          Oferece a página de reservas, a agenda da equipe, o cadastro de clientes, o registro de recebimentos, relatórios e
          mensagens prontas. A {name} não presta o serviço agendado (corte, procedimento, sessão…) nem processa pagamentos:
          o atendimento e o pagamento são combinados diretamente entre você e o negócio.
        </p>
      </section>

      <section>
        <h2>2. Para quem agenda</h2>
        <ul>
          <li>Não é preciso criar conta. Informe dados verdadeiros: o negócio usa o telefone para falar com você.</li>
          <li>
            Pelo link do agendamento você confirma presença, remarca ou cancela, dentro das regras de cada negócio (por
            exemplo, o prazo mínimo para cancelar pelo link).
          </li>
          <li>
            Preços, duração, políticas de atraso, falta e cancelamento são definidos por cada negócio e aparecem na página
            dele.
          </li>
          <li>Não use a página para reservas falsas ou para atrapalhar a agenda do negócio.</li>
        </ul>
      </section>

      <section>
        <h2>3. Para os negócios</h2>
        <ul>
          <li>
            O acesso é pessoal: cada pessoa da equipe tem o próprio e-mail e senha. Guarde a senha e avise a {name} se suspeitar
            de uso indevido.
          </li>
          <li>
            O negócio é responsável pelas informações que publica (serviços, preços, fotos, textos), pelo atendimento aos
            seus clientes e por tratar os dados deles de acordo com a LGPD, como controlador.
          </li>
          <li>Planos, valores, prazos e suporte seguem o contrato comercial firmado com a {name}, que prevalece sobre estes termos.</li>
          <li>Ao encerrar o uso, o negócio pode pedir uma cópia dos seus dados.</li>
        </ul>
      </section>

      <section>
        <h2>4. Disponibilidade</h2>
        <p>
          Trabalhamos para manter a plataforma no ar o tempo todo, mas podem ocorrer interrupções para manutenção ou por
          falhas de fornecedores de infraestrutura e de internet. Sempre que possível, avisamos com antecedência.
        </p>
      </section>

      <section>
        <h2>5. Responsabilidades</h2>
        <p>
          A {name} não responde pelo serviço prestado pelo negócio, por valores combinados entre as partes, por faltas ou
          cancelamentos, nem por informações incorretas cadastradas pelo negócio ou por quem agenda. Nada nestes termos afasta
          direitos garantidos pelo Código de Defesa do Consumidor.
        </p>
      </section>

      <section>
        <h2>6. Propriedade</h2>
        <p>
          A marca, o software e o visual da {name} pertencem à {name}. Logos, fotos e textos de cada negócio continuam
          sendo do próprio negócio.
        </p>
      </section>

      <section>
        <h2>7. Mudanças e lei aplicável</h2>
        <p>
          Podemos atualizar estes termos; a data da última atualização fica no topo da página. Vale a lei brasileira.
        </p>
      </section>
    </LegalPage>
  );
}
