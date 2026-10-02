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

Proposta:

| Plano | Profissionais | Mensal | Anual (2 meses grátis) |
|---|---|---|---|
| Essencial | até 3 | R$ 89 | R$ 890 |
| Equipe | 4–8 | R$ 149 | R$ 1.490 |
| Completo | 9+ | R$ 249 | R$ 2.490 |

- **Implantação (única): R$ 490–990** — identidade, cadastro de serviços, equipe e horários, treinamento de 30 min por vídeo, link pronto para a bio do Instagram.
- **Add-ons**: domínio próprio (+R$ 20/mês); remover "Agendamento por Aprazzo" do rodapé (incluso no Completo).
- **Exclusivo** (instalação dedicada): sob consulta, a partir de R$ 3.000 + R$ 400/mês.
- **Regra de ouro**: não dê desconto no mensal. Se precisar ceder, ceda na implantação — o mensal é o seu patrimônio.

## Processo de venda

1. **Abordagem** (Instagram/WhatsApp) com uma **demo personalizada**: logo e cor do prospect num link de demonstração. É o argumento mais forte.
2. **Call de 20 min**: perguntar pela dor (faltas, agenda no caderno, comissão calculada à mão, cliente que some) e mostrar só as telas que resolvem essa dor.
3. **Proposta por escrito no mesmo dia**, validade de 7 dias.
4. **Fechou**: cobrar a implantação antes de começar, assinar o contrato, iniciar a mensalidade na data da entrega.
5. **Teste de 14 dias** só depois da implantação paga (implantar dá trabalho; teste grátis sem compromisso atrai curioso).

## Entrega e retenção

- **Formulário de onboarding**: logo (PNG/SVG), cor, nome, endereço, horários, serviços (preço e duração), equipe (nome e WhatsApp), políticas (antecedência, prazo de cancelamento).
- **Entrega em até 48 h.** Meta da primeira semana: a primeira reserva feita por um cliente real pelo link.
- **Check-in nos dias 7 e 30.** O cancelamento costuma acontecer nos primeiros 60 dias, por falta de uso — acompanhe quem não está usando.
- **Suporte por WhatsApp** em horário comercial definido em contrato.

## Legal e operação

- **Empresa**: MEI não pode ter atividade de SaaS. Abrir ME no Simples Nacional (CNAE 6203-1/00 ou 6311-9/00); Anexo V (a partir de 15,5%) ou Anexo III (a partir de 6%) via Fator R com pró-labore. **Confirmar com um contador.** — [Meu Contador Online](https://www.meucontadoronline.com.br/blog/cnae-software-servico-saas-guia-completo/), [Agilize](https://agilize.com.br/artigos/cnae-6203100-o-que-e/).
- **Documentos**: contrato de assinatura (SLA, suporte, reajuste anual, cancelamento, exportação dos dados ao sair), termos de uso e política de privacidade.
- **LGPD**: o negócio é o *controlador* dos dados dos clientes dele; você é o *operador*. Cláusula de tratamento de dados no contrato.
- **Cobrança da mensalidade**: Pix automático/boleto/cartão por serviço externo (ex.: Asaas). Fica fora do sistema.
- **Custo de infraestrutura**: Vercel Pro (US$ 20/mês por pessoa — o plano gratuito proíbe uso comercial: [Vercel Pricing](https://vercel.com/pricing), [Flexprice](https://flexprice.io/blog/vercel-pricing-breakdown)) + Postgres gerenciado (US$ 0–25/mês). Custo fixo: o segundo cliente já paga a infraestrutura.
