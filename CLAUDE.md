# Project Context

Sistema de agendamento/reservas multi-tenant para negócios baseados em horário marcado (barbearias, salões, clínicas, consultórios). Projeto de portfólio — deve parecer um produto real e vendável, não um CRUD de estudo. Prioridade: UI moderna, fluxo de agendamento com fricção mínima, decisões de arquitetura defensáveis em entrevista técnica.

Antes de qualquer mudança de arquitetura ou de schema, pare e proponha um plano. Antes de mexer na lógica de disponibilidade de horários, pergunte se há testes cobrindo o comportamento atual.

## About This Project

- Negócio (`Business`) cadastra profissionais, serviços e horário de funcionamento.
- Cliente final agenda por uma página pública (`/{slug}`) **sem criar conta**.
- Cancelamento/reagendamento do cliente é feito por um `manage_token` único por agendamento (UUID v4), nunca por login ou por ID sequencial na URL.
- Documento de escopo completo (regras de negócio, personas, referências de UX): `docs/escopo-sistema-agendamento.md`.

## Stack

- Frontend: Next.js + TypeScript + Tailwind CSS + shadcn/ui
- Backend: NestJS (ou API Routes do Next.js) — Node.js + TypeScript
- Banco: PostgreSQL via Prisma
- Auth: JWT + bcrypt (apenas para admin do negócio; cliente final não autentica)
- Testes: Vitest/Jest (unitário, foco em disponibilidade de horários) + Playwright (E2E do fluxo de agendamento)
- Deploy: Vercel (app) + Railway/Render (Postgres)

## Key Directories

Estrutura alvo (criar conforme o projeto avança — ajustar esta seção quando divergir):

```
src/
├── app/                  # rotas Next.js (painel admin e página pública)
│   ├── (admin)/          # área autenticada do negócio
│   └── [slug]/           # página pública de agendamento
├── modules/
│   ├── business/
│   ├── professional/
│   ├── service/
│   ├── appointment/      # inclui lógica de slots disponíveis e manage_token
│   └── auth/
├── lib/                  # utilidades compartilhadas (datas, timezone, tokens)
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── tests/
docs/
└── escopo-sistema-agendamento.md
```

## Standards

- TypeScript estrito (`strict: true`), sem `any` não justificado.
- Toda rota pública de agendamento busca registros por `manage_token`/`slug`, nunca por ID numérico sequencial.
- Toda lógica de cálculo de horário disponível deve ter teste unitário cobrindo: sobreposição de horários, timezone, duração variável por serviço, bloqueios manuais.
- Isolamento multi-tenant: toda query de dados do negócio deve filtrar por `business_id` — nunca confiar apenas no ID do recurso filho.
- Componentes de UI seguem o design system do shadcn/ui; evitar CSS solto fora do Tailwind.
- Commits pequenos e descritivos (Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`).
- Nunca commitar `.env`, chaves de API ou strings de conexão do banco.

## Common Commands

```bash
npm run dev              # servidor de desenvolvimento
npm run build            # build de produção
npx prisma migrate dev   # aplicar migrations em dev
npx prisma studio        # inspecionar dados
npm run test             # testes unitários
npm run test:e2e         # testes end-to-end (Playwright)
```

## Standard Workflow

Para qualquer tarefa não trivial, seguir nesta ordem:
1. É uma pergunta sobre o estado atual do código, ou uma mudança? Se for dúvida, investigar antes de propor código.
2. Precisa de plano antes de implementar? Para mudanças de schema, de fluxo de autenticação, ou da lógica de disponibilidade, sim — apresentar o plano e esperar confirmação.
3. Falta alguma informação? Perguntar antes de assumir regra de negócio não descrita em `docs/escopo-sistema-agendamento.md`.
4. Como validar? Definir o teste (unitário ou E2E) antes ou junto da implementação, especialmente em `appointment/`.

Ordem de desenvolvimento recomendada: schema + migrations → API de disponibilidade de horários (com testes) → autenticação do admin → painel admin → página pública do cliente → fluxo de cancelamento por token → polimento de UI → deploy.

## Notes

- Cliente final nunca precisa de conta — essa é uma decisão de produto intencional, não uma lacuna a "corrigir".
- `manage_token` deve ter expiração opcional e a rota que o consome deve responder com erro genérico quando o token é inválido (não revelar se o agendamento existe).
- Cor de destaque e logo são configuráveis por negócio (personalização usada como diferencial de venda) — ao mexer em tema/estilo, preservar esse ponto de extensão.
