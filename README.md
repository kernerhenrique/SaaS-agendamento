# Agendamento SaaS

SaaS multi-tenant de agendamento online para negócios baseados em horário marcado (barbearias, salões, clínicas, consultórios). Cada negócio cadastra profissionais, serviços e horários; clientes finais agendam por um link público, **sem criar conta**.

> 🇧🇷 [Português](#-português) · 🇺🇸 [English](#-english)

**Demo ao vivo:** _[adicionar link aqui após o deploy]_
**Login de teste (admin):** `dono@navalhadeouro.com` / `senha123`
**Página pública de teste:** `/navalha-de-ouro`

---

## 🇧🇷 Português

### Índice
- [Stack](#stack)
- [Decisões técnicas e trade-offs](#decisões-técnicas-e-trade-offs)
- [Rodando localmente](#rodando-localmente)
- [Scripts disponíveis](#scripts-disponíveis)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Deploy](#deploy)
- [Fora do escopo do MVP](#fora-do-escopo-do-mvp)

### Stack

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui (Base UI)
- **Backend:** API Routes / Route Handlers do próprio Next.js — sem servidor separado
- **Banco:** PostgreSQL + Prisma ORM
- **Autenticação:** JWT (access + refresh token) com bcrypt, via cookies `httpOnly`
- **E-mail:** Nodemailer via Gmail SMTP (App Password)
- **Testes:** Vitest (unitário, lógica de disponibilidade/auth) + Playwright (E2E do fluxo de agendamento)

### Decisões técnicas e trade-offs

Este projeto prioriza decisões defensáveis em entrevista técnica sobre "só funcionar". Os pontos abaixo foram descobertos, testados ou corrigidos durante o desenvolvimento — não são só escolhas de design no papel.

**Cliente final nunca tem conta.** Cada agendamento gera um `manage_token` (UUID v4) usado para cancelar/reagendar via `/agendamento/{token}/gerenciar`. Regras de segurança aplicadas:
- Nunca busca por nome/telefone/e-mail combinados — sempre só pelo token.
- Token inválido ou expirado retorna a mesma mensagem genérica (não revela se o agendamento existe).
- Rate limiting (20 req/5min por IP) em todas as rotas que recebem o token.
- Token expira 30 dias após o horário do atendimento.

**Prevenção de conflito de horário em duas camadas.** A aplicação faz uma checagem otimista antes de inserir, mas só uma **exclusion constraint do Postgres** (`EXCLUDE USING gist`, via `btree_gist`) garante a invariante sob concorrência real (dois clientes confirmando o mesmo horário ao mesmo tempo). Testado manualmente inserindo agendamentos sobrepostos via SQL direto.

**Timezone tratado como cidadão de primeira classe.** `WorkingHours` guarda minutos-desde-meia-noite (não `DateTime`) porque é um padrão recorrente semanal, não um instante. `Appointment`/`TimeBlock` guardam `timestamptz` em UTC; toda conversão para hora local do negócio passa por `src/lib/date.ts`, testado inclusive contra virada de horário de verão (com um timezone que ainda observa DST, já que o Brasil não observa mais desde 2019).

**Isolamento multi-tenant.** Toda query de dados do negócio filtra por `businessId` derivado da sessão do admin (nunca de um valor vindo do client). Rotas do admin usam prefixo real `/admin/*` — não um route group — para não colidir com a página pública dinâmica `/{slug}` de cada negócio; `admin` e `api` ficam reservados como slug.

**Refresh token revogável sem tabela de sessões.** Logout e troca de senha incrementam `User.tokenVersion`, invalidando de uma vez todos os refresh tokens já emitidos. O access token (15min) não é reverificado contra o banco a cada request — só o refresh (7 dias) é. Trade-off consciente: um access token comprometido continua válido até expirar naturalmente, mesmo após logout; a janela é curta e documentada aqui, não escondida.

**Rate limiting em memória — limitação conhecida.** `src/lib/rate-limit.ts` guarda o estado em `globalThis` (não um `Map` solto no topo do módulo) porque o Next.js/Turbopack pode compilar Route Handlers e Server Components de página em módulos separados — sem isso, o limite "furava" entre a página de gerenciamento e as APIs que deveriam compartilhar o mesmo balde (bug real, encontrado testando manualmente). Ainda assim, isso só funciona corretamente numa instância única; em produção com múltiplas instâncias seria necessário um armazenamento compartilhado (Redis/Upstash).

### Rodando localmente

Pré-requisitos: Node.js ≥20.19 (o projeto foi desenvolvido com Node 24), Docker.

```bash
git clone <url-deste-repositório>
cd projeto-1
npm install

cp .env.example .env
# edite .env: gere um JWT_SECRET, e opcionalmente preencha GMAIL_USER/
# GMAIL_APP_PASSWORD (sem isso, o e-mail de confirmação só é logado no
# console em vez de enviado — o fluxo de agendamento funciona igual)

docker compose up -d          # Postgres local
npx prisma migrate dev        # aplica o schema
npx prisma db seed            # popula dados de exemplo

npm run dev                   # http://localhost:3000
```

### Scripts disponíveis

```bash
npm run dev              # servidor de desenvolvimento
npm run build             # build de produção
npm run lint              # eslint
npm run test               # testes unitários (Vitest)
npm run test:e2e          # teste E2E do fluxo de agendamento (Playwright)
npx prisma studio         # inspecionar o banco visualmente
npx prisma migrate dev    # aplicar migrations em dev
```

### Estrutura do projeto

```
prisma/
├── schema.prisma          # modelo de dados
├── seed.ts                # dados de exemplo
└── migrations/

src/
├── app/
│   ├── admin/              # painel do negócio (autenticado)
│   ├── [slug]/              # página pública de agendamento
│   ├── agendamento/[manageToken]/gerenciar/   # cancelar/reagendar/avaliar
│   └── api/                # route handlers (admin, público, availability)
├── server/
│   ├── modules/             # lógica de negócio por domínio
│   │   ├── appointment/     # disponibilidade, criação, status, cancelamento
│   │   ├── auth/            # login, tokens, sessão
│   │   ├── professional/
│   │   ├── service/
│   │   ├── report/
│   │   └── notification/    # e-mail
│   └── db/prisma.ts         # singleton do PrismaClient
├── lib/                     # utilidades (timezone, rate limit, .ics, etc.)
└── components/              # shadcn/ui + componentes de domínio

tests/
├── unit/                    # Vitest
└── e2e/                     # Playwright
```

### Deploy

1. **Banco de dados:** crie um Postgres gerenciado (Supabase, Neon, Railway...). Rode `npx prisma migrate deploy` contra ele (não `migrate dev`).
2. **Vercel:** conecte o repositório, configure as variáveis de ambiente (`DATABASE_URL`, `JWT_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `APP_BASE_URL`) e faça o deploy — o projeto já é um app Next.js padrão, sem configuração extra necessária.
3. Rode `npx prisma db seed` contra o banco de produção se quiser dados de demonstração.

### Fora do escopo do MVP

Documentado deliberadamente como próximos passos, não como lacunas esquecidas:
- Multi-idioma na interface (PT/EN)
- Pagamento antecipado/sinal (Stripe)
- Notificação por WhatsApp
- Login próprio para profissionais
- Bloqueio automático de cliente com muitos no-shows
- Fluxo de "recuperar meu agendamento" por telefone/e-mail (sem expor o token)
- Tela de configurações do negócio (nome, logo, cor, timezone) no painel admin — hoje só editável via seed/banco
- Rate limiting distribuído (Redis/Upstash) para múltiplas instâncias

---

## 🇺🇸 English

### Table of contents
- [Stack](#stack-1)
- [Technical decisions and trade-offs](#technical-decisions-and-trade-offs)
- [Running locally](#running-locally)
- [Available scripts](#available-scripts)
- [Project structure](#project-structure)
- [Deployment](#deployment)
- [Out of MVP scope](#out-of-mvp-scope)

A multi-tenant SaaS for appointment-based businesses (barbershops, salons, clinics). Each business registers professionals, services and working hours; end clients book through a public link — **no account required**.

### Stack

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui (Base UI)
- **Backend:** Next.js API Routes / Route Handlers — no separate server
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** JWT (access + refresh token) with bcrypt, via `httpOnly` cookies
- **Email:** Nodemailer via Gmail SMTP (App Password)
- **Testing:** Vitest (unit — availability/auth logic) + Playwright (E2E booking flow)

### Technical decisions and trade-offs

This project prioritizes decisions defensible in a technical interview over "just works." The points below were discovered, tested, or fixed during development — not just decisions made on paper.

**End clients never have an account.** Every booking generates a `manage_token` (UUID v4) used to cancel/reschedule via `/agendamento/{token}/gerenciar`. Security rules applied:
- Never looks up by combined name/phone/email — always by token alone.
- An invalid or expired token returns the same generic message (never reveals whether the booking exists).
- Rate limiting (20 req/5min per IP) on every route that accepts the token.
- The token expires 30 days after the appointment time.

**Two-layer overlap prevention.** The application does an optimistic check before inserting, but only a **Postgres exclusion constraint** (`EXCLUDE USING gist`, via `btree_gist`) guarantees the invariant under real concurrency (two clients confirming the same slot at the same time). Manually verified by inserting overlapping appointments directly via SQL.

**Timezone treated as a first-class concern.** `WorkingHours` stores minutes-since-midnight (not `DateTime`) because it's a recurring weekly pattern, not an instant. `Appointment`/`TimeBlock` store UTC `timestamptz`; every conversion to the business's local time goes through `src/lib/date.ts`, tested against DST transitions too (using a timezone that still observes DST, since Brazil stopped observing it in 2019).

**Multi-tenant isolation.** Every business-data query filters by `businessId` derived from the admin session (never from a client-supplied value). Admin routes use a real `/admin/*` path prefix — not a route group — to avoid colliding with each business's dynamic public page `/{slug}`; `admin` and `api` are reserved slugs.

**Revocable refresh tokens without a sessions table.** Logout and password changes increment `User.tokenVersion`, invalidating every previously issued refresh token at once. The access token (15min) isn't re-checked against the database on every request — only the refresh token (7 days) is. Conscious trade-off: a compromised access token stays valid until it naturally expires, even after logout; the window is short and documented here, not hidden.

**In-memory rate limiting — known limitation.** `src/lib/rate-limit.ts` stores state on `globalThis` (not a bare module-level `Map`) because Next.js/Turbopack can compile Route Handlers and page Server Components into separate module chunks — without this, the limit "leaked" between the management page and the API routes that were supposed to share the same bucket (a real bug, found through manual testing). This still only works correctly within a single instance; production with multiple instances would need shared storage (Redis/Upstash).

### Running locally

Prerequisites: Node.js ≥20.19 (developed with Node 24), Docker.

```bash
git clone <this-repository-url>
cd projeto-1
npm install

cp .env.example .env
# edit .env: generate a JWT_SECRET, and optionally fill in GMAIL_USER/
# GMAIL_APP_PASSWORD (without it, the confirmation email is just logged
# to the console instead of sent — the booking flow works the same)

docker compose up -d          # local Postgres
npx prisma migrate dev        # applies the schema
npx prisma db seed            # seeds sample data

npm run dev                   # http://localhost:3000
```

### Available scripts

```bash
npm run dev              # development server
npm run build             # production build
npm run lint              # eslint
npm run test               # unit tests (Vitest)
npm run test:e2e          # E2E booking flow test (Playwright)
npx prisma studio         # inspect the database visually
npx prisma migrate dev    # apply migrations in dev
```

### Project structure

See the [Portuguese section above](#estrutura-do-projeto) — the tree is the same regardless of language.

### Deployment

1. **Database:** provision a managed Postgres (Supabase, Neon, Railway...). Run `npx prisma migrate deploy` against it (not `migrate dev`).
2. **Vercel:** connect the repository, set the environment variables (`DATABASE_URL`, `JWT_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `APP_BASE_URL`) and deploy — it's a standard Next.js app, no extra configuration needed.
3. Run `npx prisma db seed` against the production database if you want demo data.

### Out of MVP scope

Deliberately documented as next steps, not forgotten gaps:
- Multi-language UI (PT/EN)
- Upfront payment/deposit (Stripe)
- WhatsApp notifications
- Professional-level login
- Automatic blocking of clients with excessive no-shows
- "Recover my booking" flow by phone/email (without exposing the token)
- Business settings screen (name, logo, color, timezone) in the admin panel — currently only editable via seed/database
- Distributed rate limiting (Redis/Upstash) for multiple instances
