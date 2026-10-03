import type { Metadata } from "next";

import { LegalPage } from "@/components/legal-page";
import { BRAND } from "@/config/brand";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: `Como a ${BRAND.name} trata dados pessoais de quem agenda e de quem usa o painel.`,
};

/** Política de privacidade (LGPD). Texto-base: revisar com advogado antes de escalar as vendas. */
export default function PrivacyPage() {
  const name = BRAND.name;
  return (
    <LegalPage title="Política de privacidade">
      <p>
        A {name} é uma plataforma de agendamento e gestão usada por negócios que atendem com horário marcado (barbearias,
        clínicas, estúdios, salões e outros). Esta política explica quais dados pessoais passam pela plataforma, para quê e
        quais são os seus direitos, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018, LGPD).
      </p>

      <section>
        <h2>1. Quem é responsável pelos dados</h2>
        <ul>
          <li>
            <strong>Quando você agenda um horário</strong> na página de um negócio, esse negócio é o <em>controlador</em> dos
            seus dados: é ele quem decide como usá-los para o atendimento. A {name} é a <em>operadora</em>: guarda e processa
            os dados em nome do negócio, só para prestar o serviço.
          </li>
          <li>
            <strong>Quando você usa o painel</strong> (dono ou equipe de um negócio), a {name} é a controladora dos dados da
            sua conta de acesso.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. Quais dados</h2>
        <ul>
          <li>
            <strong>De quem agenda:</strong> nome, telefone/WhatsApp, e-mail (opcional), os agendamentos feitos (serviço,
            profissional, data e hora), pagamentos registrados pelo negócio e anotações que o
            negócio fizer sobre o atendimento.
          </li>
          <li>
            <strong>De quem usa o painel:</strong> nome, e-mail de acesso e senha (guardada só de forma cifrada, que nem nós
            conseguimos ler), além do registro de quem fez cada ação (por exemplo, quem marcou ou cancelou um horário).
          </li>
          <li>
            <strong>Dados técnicos:</strong> endereço IP, usado só para segurança (limitar tentativas abusivas), e os cookies
            descritos no item 7.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Para que usamos</h2>
        <ul>
          <li>Reservar, confirmar, lembrar, remarcar e cancelar atendimentos.</li>
          <li>Enviar a confirmação e o link para você gerenciar o seu agendamento.</li>
          <li>Permitir que o negócio organize a agenda, o histórico de clientes, os recebimentos e os relatórios.</li>
          <li>Manter a plataforma segura e funcionando.</li>
        </ul>
        <p>
          Não vendemos dados pessoais, não os usamos para publicidade e não enviamos mensagens de marketing em nome próprio.
        </p>
      </section>

      <section>
        <h2>4. Bases legais</h2>
        <p>
          Execução de contrato e de procedimentos preliminares (o agendamento que você pediu e o serviço contratado pelo
          negócio), legítimo interesse (segurança e melhoria do serviço, sempre respeitando os seus direitos) e cumprimento
          de obrigações legais, quando houver.
        </p>
      </section>

      <section>
        <h2>5. Com quem os dados são compartilhados</h2>
        <ul>
          <li>Com o negócio em que você agendou, que é quem atende você.</li>
          <li>
            Com fornecedores que operam a infraestrutura da plataforma: hospedagem (Vercel), banco de dados (Neon) e envio
            de e-mails (Google). Eles só tratam os dados para prestar esse serviço e podem manter servidores fora do Brasil,
            com garantias contratuais de proteção compatíveis com a LGPD.
          </li>
          <li>Com autoridades, quando a lei exigir.</li>
        </ul>
      </section>

      <section>
        <h2>6. Por quanto tempo</h2>
        <p>
          Enquanto o negócio usar a plataforma e for necessário para o histórico de atendimentos dele, ou pelo prazo exigido
          por lei. Quando um negócio deixa a {name}, ele pode pedir uma cópia dos seus dados e, depois, a exclusão. O link de
          gerenciar um agendamento deixa de funcionar 30 dias após o horário.
        </p>
      </section>

      <section>
        <h2>7. Cookies</h2>
        <p>
          Usamos apenas cookies e armazenamento local essenciais: a sessão de quem entra no painel e preferências de tela
          (tema claro ou escuro, menu recolhido). Não usamos cookies de rastreamento nem de publicidade.
        </p>
      </section>

      <section>
        <h2>8. Seus direitos</h2>
        <p>
          Você pode pedir confirmação de que tratamos seus dados, acesso, correção, anonimização, portabilidade, exclusão,
          informação sobre compartilhamentos e revisão do consentimento, nos termos do art. 18 da LGPD.
        </p>
        <p>
          Para dados de agendamento, fale primeiro com o negócio em que você agendou (ele é o controlador). Se precisar,
          fale com a {name} pelo contato no fim desta página: ajudamos o negócio a atender o seu pedido.
        </p>
      </section>

      <section>
        <h2>9. Segurança</h2>
        <p>
          Conexão sempre criptografada (HTTPS), senhas cifradas, links pessoais impossíveis de adivinhar, separação dos dados
          de cada negócio e acesso da equipe limitado ao que cada função precisa. Nenhum sistema é 100% imune; se houver um
          incidente relevante, os afetados e a autoridade serão avisados como manda a lei.
        </p>
      </section>

      <section>
        <h2>10. Mudanças nesta política</h2>
        <p>
          Podemos atualizar este texto para refletir mudanças no serviço ou na lei. A data da última atualização fica no topo
          da página.
        </p>
      </section>
    </LegalPage>
  );
}
