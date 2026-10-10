# Guia de vendas — Aprazzo

> Documento de negócio (não técnico). Números são **proposta inicial** para validar com os primeiros clientes; revisar a cada 5 vendas. Pesquisa feita em 2026-10.

## Modelo de entrega

**Um sistema só, entrega personalizada.** Cada comprador recebe o sistema com o nome, a logo, a cor, o nicho (termos e recursos) e os dados dele, num link próprio (`aprazzo.com.br/{slug}`; subdomínio ou domínio próprio como add-on). Tecnicamente é o mesmo app e o mesmo banco para todos (multi-inquilino), o que mantém todos os clientes na mesma versão e o custo de infraestrutura fixo.

"Criar um cliente novo" = `npm run novo-cliente` (Fase 7), não copiar o código. Instalação dedicada (código/banco/servidor próprios) só no plano **Exclusivo**.

## Posicionamento

- Não venda "sistema de agendamento". Venda: **"seu negócio com página de reservas própria, agenda da equipe e financeiro — entregue pronto em 48 h"**.
- O diferencial frente a Trinks/Booksy/Fresha é a **implantação feita por você**: eles entregam uma conta vazia; você entrega funcionando, com a cara do negócio.
- **Comece por um nicho**: barbearias com 2–8 profissionais. Depois de 5–10 clientes satisfeitos (e depoimentos), abra o segundo nicho (estética, tatuagem).

## Preço

Referências de mercado:
- Trinks (plano anual), por número de profissionais: R$ 65/mês (1–2), R$ 94 (3–4), R$ 161 (5–10), R$ 236 (11–20), R$ 360 (21–30) — [planos Trinks](https://negocios.trinks.com/planos/), [Revista Fórum](https://revistaforum.com.br/cupom/trinks/plano-trinks-anual-a-partir-de-r-65-mes).
- Mercado brasileiro: R$ 50–80 fixo é a faixa de "melhor custo-benefício"; R$ 80–150 com extras; desconto anual de 15–25% — [SP Agenda](https://spagenda.com/artigo/quanto-custa-sistema-agendamento).
- White-label/implantação no mercado internacional: taxa de setup típica de US$ 500–2.500 — [SuiteDash](https://suitedash.com/best-white-label-saas-reseller-programs/), [GainHQ](https://gainhq.com/blog/white-label-saas/).

Há dois jeitos de cobrar. Escolha **um** por proposta e não misture os dois na mesma conversa.

### Modelo A (recomendado): implantação + mensalidade fixa

Um valor maior na entrada, pelo trabalho de deixar o sistema pronto, e uma **mensalidade fixa**, igual para qualquer tamanho de equipe, que cobre hospedagem, manutenção, atualizações e suporte. O cliente não paga mais quando contrata outro profissional.

| Pacote de implantação | Valor único | O que inclui |
|---|---|---|
| Padrão | R$ 1.497 (ou 3× R$ 499) | Identidade (logo, capa, cor), serviços, equipe, expedientes e regras de reserva cadastrados; importação da planilha de clientes; treinamento de 1 h por vídeo (dono e equipe); link pronto para a bio do Instagram; 30 dias de acompanhamento próximo |
| Completo | R$ 2.497 (ou 3× R$ 833) | Tudo do Padrão + domínio próprio configurado (agendar.negocio.com.br), textos e fotos da página revisados com o dono, migração de clientes de outro sistema, 2 treinamentos e sem "Agendamento por Aprazzo" no rodapé |

| Mensalidade | Mensal | Anual (2 meses grátis) |
|---|---|---|
| Manutenção e hospedagem, qualquer número de profissionais | R$ 179 | R$ 1.790 |

**A mensalidade inclui:**
- hospedagem do sistema e do banco de dados, com cópias de segurança;
- atualizações e melhorias novas da Aprazzo, sem custo extra;
- suporte por WhatsApp em horário comercial (link de senha nova, dúvidas de uso, ajustes de cadastro);
- até 1 h por mês de pequenos ajustes feitos por você (trocar logo, cadastrar uma leva de serviços, rever horários);
- domínio próprio mantido, quando contratado na implantação.

**Fica fora (orçamento à parte):** funcionalidade feita sob medida para um cliente, integrações novas e treinamentos extras. Lembre: o que entra no sistema vale para todos os clientes, então pedido de um cliente vira melhoria geral só quando fizer sentido para o produto.

**Limite justo:** o preço fixo vale para **um negócio (uma unidade)** com até 20 profissionais ativos. Rede com várias unidades ou equipe maior recebe proposta própria (cada unidade é um negócio cadastrado).

**Por que vender assim:**
- A implantação paga o seu trabalho logo na entrada e faz o cliente se comprometer: quem pagou R$ 1.497 usa o sistema.
- Mensalidade única é fácil de explicar ("R$ 179 por mês, tudo incluso") e não pune o crescimento da equipe.
- Para negócios com equipe grande fica mais barato que o mercado: o Trinks cobra R$ 236/mês de 11 a 20 profissionais.

**Cuidado:** para equipes pequenas, a conta de 12 meses fica acima do mercado (Padrão + 12× R$ 179 = R$ 3.645, contra cerca de R$ 1.130 no Trinks para 3–4 profissionais). Justifique pelo que o concorrente não entrega: sistema pronto em 48 h com a marca do negócio, suporte de uma pessoa que conhece o cliente e nada para configurar sozinho. Se o cliente achar caro, ofereça o **Modelo A Leve** (abaixo); para barbearia de 1–2 pessoas que ainda assim não aceita, use o Modelo B.

### Modelo A Leve: a mesma ideia, mais barata

Mesma lógica do Modelo A (implantação + mensalidade fixa, sem cobrar por profissional), com menos serviço incluído. É a porta de entrada para negócios pequenos que acham o Modelo A caro, sem cair na cobrança por tamanho de equipe.

| | A Leve | A |
|---|---|---|
| Implantação | R$ 997 (ou 3× R$ 332) | R$ 1.497 a R$ 2.497 |
| Mensalidade | R$ 149 (anual R$ 1.490) | R$ 179 (anual R$ 1.790) |
| Primeiro ano | R$ 2.785 | a partir de R$ 3.645 |

**A implantação Leve inclui:** identidade (logo, capa, cor), serviços, equipe, expedientes e regras de reserva cadastrados a partir do formulário de onboarding, importação da planilha de clientes se ela vier pronta no modelo, treinamento de 30 min por vídeo, o manual de uso e 15 dias de acompanhamento.

**A mensalidade Leve inclui:** hospedagem, cópias de segurança, atualizações e suporte por WhatsApp em horário comercial. **Não inclui** a 1 h mensal de ajustes feitos por você: o próprio dono mexe em serviços, equipe, horários, logo e cor pelo painel (está tudo no manual). Ajuste feito por você é cobrado à parte ou resolvido com a troca para o Modelo A.

**Fica de fora do Leve:** domínio próprio, migração de outro sistema, revisão de textos e fotos e o segundo treinamento.

**Como usar na venda:**
- Ofereça o Modelo A primeiro. Se o cliente achar caro, apresente o Leve como "a mesma coisa, mas você mesmo faz os ajustes do dia a dia".
- Subir do Leve para o A depois é simples: o cliente paga a diferença da implantação e a mensalidade passa a R$ 179.
- Mesmo limite justo do Modelo A: um negócio, até 20 profissionais.

**Fidelidade:** nos dois (A e A Leve), contrato de 12 meses. Se o cliente sair antes, a implantação não é devolvida; os dados dele são exportados (Relatórios › Exportar CSV) e entregues.

### Modelo B: mensalidade por tamanho de equipe

Para quem quer entrada baixa, normalmente negócio pequeno:

| Plano | Profissionais | Mensal | Anual (2 meses grátis) |
|---|---|---|---|
| Essencial | até 3 | R$ 89 | R$ 890 |
| Equipe | 4–8 | R$ 149 | R$ 1.490 |
| Completo | 9–15 | R$ 249 | R$ 2.490 |

- **Implantação (única): R$ 490–990**: identidade, cadastro de serviços, equipe e horários, treinamento de 30 min por vídeo, link pronto para a bio do Instagram.
- **O sistema confere o limite**: na entrega, `limiteProfissionais` no arquivo do cliente (3, 8 ou 15). Se o dono tentar ativar mais alguém, a tela explica o limite e manda falar com a Aprazzo. Mudou de plano: `npm run limite-profissionais -- <slug> <novo limite> --producao`. Acima de 15 ou com mais de uma unidade, proposta sob consulta.

### Plano Solo: para quem atende sozinho

Manicure, esteticista, tatuador ou barbeiro que trabalha sem equipe. O sistema é o mesmo; só o limite muda (`limiteProfissionais: 1`), e com ele a experiência:
- **Página de reservas em 3 passos**: serviço → data e hora → dados (o cliente não escolhe profissional).
- **Painel enxuto**: "Profissionais" vira "Folgas" (dias em que não atende); o horário de atendimento é um só, em Configurações, e já gera os horários da página; serviço novo já é da pessoa. Somem comissões, convite de equipe e a comparação entre profissionais nos Relatórios.

| | Solo |
|---|---|
| Implantação | R$ 497 (ou 3× R$ 165,67) |
| Mensalidade | R$ 69 (anual R$ 690) |
| Primeiro ano | R$ 1.325 |
| Limite | 1 profissional ativo |

- **Inclui** a implantação (identidade, serviços, expediente e regras pelo formulário de onboarding, importação da planilha pronta, treinamento de 30 min e manual) e a mensalidade (hospedagem, cópias de segurança, atualizações e suporte por WhatsApp). **Não inclui** domínio próprio, migração nem ajustes feitos por você (cobrados à parte).
- **Contratou alguém?** Mude para um plano com equipe: `npm run limite-profissionais -- <slug> sem --producao` (A Leve ou A) ou `<slug> 3` (Essencial). Os dados continuam, e o painel ganha as telas de equipe na hora.
- **Demonstração**: no primeiro contato, mande `aprazzo.com.br/demo-solo` (Ana Sobrancelhas, reserva em 3 passos e painel do Solo). Para quem está quase fechando, monte a prévia com a cara dele a partir de `docs/exemplo-cliente-solo.json`, com `--demo`.
- Contrato de 12 meses, como os outros planos.

### Para todos os modelos

- **Add-ons**: domínio próprio (+R$ 20/mês no Modelo B; já incluso no pacote Completo do Modelo A); remover "Agendamento por Aprazzo" do rodapé (incluso no Completo).
- **Exclusivo** (instalação dedicada): sob consulta, a partir de R$ 3.000 + R$ 400/mês.
- **Regra de ouro**: não dê desconto no mensal. Se precisar ceder, ceda na implantação (parcelar ou trocar Completo por Padrão): o mensal é o seu patrimônio.
- **Reajuste anual** da mensalidade pelo IPCA, previsto em contrato.

## Processo de venda

1. **Abordagem** (Instagram/WhatsApp) com uma **demo personalizada**: logo e cor do prospect num link de demonstração. É o argumento mais forte.
2. **Call de 20 min**: perguntar pela dor (faltas, agenda no caderno, comissão calculada à mão, cliente que some) e mostrar só as telas que resolvem essa dor.
3. **Proposta por escrito no mesmo dia**, validade de 7 dias. No Modelo A, mostre a conta em duas linhas: "Implantação R$ 1.497 (3× R$ 499) + R$ 179/mês, tudo incluso, para toda a equipe".
4. **Fechou**: cobrar a implantação antes de começar (ou a 1ª parcela), assinar o contrato, iniciar a mensalidade na data da entrega.
5. **Teste de 14 dias** só no Modelo B e só depois da implantação paga (implantar dá trabalho; teste grátis sem compromisso atrai curioso). No Modelo A, o "teste" é a demonstração personalizada antes de fechar.
6. **Entregue o manual de uso** junto com o link de primeiro acesso: o dono e a equipe tiram as dúvidas do dia a dia sozinhos.

## Entrega e retenção

- **Formulário de onboarding**: logo (PNG/SVG), cor, nome, endereço, horários, serviços (preço e duração), equipe (nome e WhatsApp), políticas (antecedência, prazo de cancelamento).
- **Entrega em até 48 h.** Meta da primeira semana: a primeira reserva feita por um cliente real pelo link.
- **Check-in nos dias 7 e 30.** O cancelamento costuma acontecer nos primeiros 60 dias, por falta de uso — acompanhe quem não está usando.
- **Suporte por WhatsApp** em horário comercial definido em contrato.

## Legal e operação

- **Começo como pessoa física** (até os primeiros clientes): é permitido vender serviço e licença de software com CPF, como autônomo. Cuidados:
  - o contrato sai no seu nome e CPF, "sob o nome comercial Aprazzo", com a cláusula que permite passar o contrato para o CNPJ depois (10.4 do modelo);
  - imposto: o que receber de pessoa física entra no **Carnê-Leão** (DARF todo mês, tabela progressiva até 27,5%); de empresa, ela pode ter de reter IR e INSS e emitir RPA. Combine antes da primeira cobrança;
  - ISS e recibo: veja na prefeitura se precisa de inscrição de autônomo e se emite nota fiscal avulsa; senão, entregue recibo;
  - você responde com o patrimônio pessoal (não há separação como numa empresa);
  - não coloque o CPF no site: as páginas de termos e privacidade só mostram razão social e CNPJ quando existirem (`LEGAL` em `src/config/brand.ts`).
  - **Confirmar com um contador** antes da primeira cobrança.
- **Empresa** (depois dos primeiros clientes): MEI não pode ter atividade de SaaS. Abrir ME no Simples Nacional (CNAE 6203-1/00 ou 6311-9/00); Anexo V (a partir de 15,5%) ou Anexo III (a partir de 6%) via Fator R com pró-labore. **Confirmar com um contador.** — [Meu Contador Online](https://www.meucontadoronline.com.br/blog/cnae-software-servico-saas-guia-completo/), [Agilize](https://agilize.com.br/artigos/cnae-6203100-o-que-e/).
- **Documentos**: contrato de assinatura (SLA, suporte, reajuste anual, cancelamento, exportação dos dados ao sair), termos de uso e política de privacidade.
- **LGPD**: o negócio é o *controlador* dos dados dos clientes dele; você é o *operador*. Cláusula de tratamento de dados no contrato.
- **Cobrança da mensalidade**: Pix automático/boleto/cartão por serviço externo (ex.: Asaas). Fica fora do sistema.
- **Custo de infraestrutura**: **uma** assinatura para todos os clientes, não uma por cliente. Todos os negócios usam o mesmo app e o mesmo banco.
  - Vercel Pro: US$ 20/mês por **membro da sua equipe** na Vercel (quem publica o sistema; hoje, só você). O plano gratuito proíbe uso comercial. O Pro já inclui uma cota de uso; só se paga a mais com muito tráfego. [Vercel Pricing](https://vercel.com/pricing), [Flexprice](https://flexprice.io/blog/vercel-pricing-breakdown).
  - Banco Postgres gerenciado (Neon): US$ 0–25/mês, também um só para todos.
  - Ou seja, custo quase fixo: o segundo cliente já paga a infraestrutura, e cada cliente novo é quase todo lucro.
