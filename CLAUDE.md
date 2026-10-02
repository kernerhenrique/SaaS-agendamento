# Project Context

SaaS de agendamento para negócios onde **mais de um profissional atende** (barbearias, clínicas/estética, estúdios de tatuagem, salões). Este repositório é o **projeto base comercial**: ele é clonado e adaptado para cada cliente fechado, recebendo a identidade visual e a terminologia daquele negócio. Não é mais projeto de portfólio.

Prioridades, nesta ordem:
1. **Usabilidade**: dono e equipe conseguem usar sem treinamento; cliente final reserva em poucos toques pelo celular.
2. **Visual moderno e consistente**, no nível de Fresha, Booksy, Trinks e Cal.com, sempre via design system.
3. **Base genérica e clonável**: nada específico de um nicho fica hardcoded.
4. **Correção**: nunca quebrar a lógica de disponibilidade, o isolamento multi-tenant nem a autenticação.

Antes de qualquer mudança de schema, autenticação ou lógica de disponibilidade de horários: **pare, proponha um plano e espere confirmação**. Antes de mexer na disponibilidade, verifique se há testes cobrindo o comportamento atual.

## Documentos de referência
- Escopo e regras de negócio: @docs/escopo-sistema-agendamento.md
- Design system (tokens, componentes, padrões de tela): @docs/design-system.md
- Como entregar um cliente novo (`npm run novo-cliente`): @docs/como-clonar.md
- Referências de mercado e padrões adotados: @docs/pesquisa-referencias.md
- Publicação (Vercel + Neon + domínio): `docs/publicacao.md`. Venda e preços (negócio, não técnico): `docs/guia-de-vendas.md`

Se algum desses arquivos ainda não existir, crie-o quando a tarefa tocar no assunto. Se este CLAUDE.md divergir do código real, **o código manda**: avise e atualize este arquivo.

## Produto em uma tela
- **Página pública** `/{slug}`: página do negócio (capa, logo, serviços, equipe, portfólio, políticas) + fluxo de reserva serviço → profissional → data/hora → dados → confirmação. Cliente final **não cria conta**.
- **Gerenciar reserva** `/agendamento/{manageToken}/gerenciar`: cancelar/reagendar via token.
- **Painel admin** `/admin/*`: Início, Agenda, Clientes, Profissionais, Serviços, Financeiro, Relatórios, Mensagens, Configurações.

## Stack
- Next.js 16 (App Router) + TypeScript estrito + Tailwind CSS v4 + shadcn/ui (Base UI), Lucide, Motion, Sonner
- Backend: Route Handlers do próprio Next.js (sem servidor separado)
- PostgreSQL + Prisma 6 com **driver adapter** (`@prisma/adapter-pg`, `engineType = "client"`): sem query engine nativo, que não era empacotado nas funções da Vercel. Todo `new PrismaClient` recebe o adaptador (`src/server/db/prisma.ts`, `prisma/seed.ts`). Erros do banco chegam como `DriverAdapterError` (o conflito de horário é reconhecido pelo nome da constraint).
- Auth: JWT (access 15min + refresh 7 dias) com bcrypt, em cookies `httpOnly`; só para usuários do negócio. Papéis: **dono** (`OWNER`) e **profissional** (`PROFESSIONAL`, ligado a um `Professional`); matriz em `src/server/modules/auth/permissions.ts`
- E-mail: Nodemailer (Gmail SMTP); sem credenciais, o e-mail é apenas logado no console. A confirmação da reserva é enviada com `after()` (depois da resposta): o cliente não espera o SMTP.
- Testes: Vitest (unitário) + Playwright (E2E)
- Deploy: Vercel (região `gru1`) + Neon em São Paulo, um app e um banco para todos os negócios. `vercel.json` roda `prisma generate`, `prisma migrate deploy` **só em produção** (conexão direta `DATABASE_URL_UNPOOLED`) e `next build`. O banco de produção não recebe o seed de teste.

## Estrutura real de diretórios
```
prisma/
├── schema.prisma
├── seed.ts                  # seeds por vertical ficam aqui (ou em prisma/seeds/)
└── migrations/
src/
├── app/
│   ├── admin/               # painel autenticado (prefixo real, NÃO route group)
│   ├── [slug]/              # página pública do negócio
│   ├── agendamento/[manageToken]/gerenciar/
│   └── api/                 # route handlers (admin, público, availability)
├── server/
│   ├── modules/             # lógica de negócio por domínio
│   │   ├── appointment/     # disponibilidade, criação, status, cancelamento, regras de horário do painel, políticas de reserva (booking-policy.ts)
│   │   ├── auth/            # login, sessão, troca de senha (password-rules.ts)
│   │   ├── business/        # Configurações do negócio: validação pura (business-rules.ts) + leitura/gravação por seção
│   │   ├── staff/           # convite de acesso da equipe e primeiro acesso do dono (token, aceite, revogar)
│   │   ├── onboarding/      # cliente novo: arquivo do cliente (client-file.ts, puro), catálogos por nicho, criação e mensagem de entrega
│   │   ├── demo/            # demonstração: dados de exemplo relativos a hoje (demo-data.ts, puro), criar/recriar, bloqueio (assertNotDemo), cron
│   │   ├── client/          # mini-CRM: lista/filtros, ficha, notas e tags, busca por telefone
│   │   ├── dashboard/       # métricas do Início (reusadas no perfil do profissional)
│   │   ├── professional/
│   │   ├── search/          # busca Ctrl+K
│   │   ├── service/
│   │   ├── payment/         # registro de pagamentos externos: regras puras (payment-rules.ts) + financeiro/comissões
│   │   ├── report/
│   │   └── notification/    # e-mail; whatsapp/ isolado: templates.ts (puro), sender.ts (wa.me hoje), message.service.ts (modelos, filas, "enviado")
│   └── db/prisma.ts         # singleton do PrismaClient
├── config/
│   ├── vertical.ts          # preset do nicho: terminologia + feature flags (ativo = Business.businessType)
│   ├── vertical-context.tsx # VerticalProvider / useVertical() para client components
│   └── brand.ts             # marca do PRODUTO (Aprazzo: nome, logos, capa): login, título, "Agendamento por", .ics
├── lib/                     # date.ts (timezone), rate-limit, .ics, formatadores pt-BR, professional-colors.ts
└── components/              # ui/ (shadcn) + componentes de domínio + admin/ (shell do painel)
scripts/
└── novo-cliente.ts          # npm run novo-cliente -- clientes/<slug>.json [--simular] [--producao]
tests/
├── unit/
├── e2e/
└── fixtures/                # cliente-e2e.json (arquivo de cliente usado no E2E)
clientes/                    # arquivos e imagens de clientes reais: FORA do git
docs/
```
Slugs reservados (não podem ser slug de negócio): `admin`, `api`, `agendamento` e os guardados para páginas da Aprazzo (`precos`, `contato`, `termos`, `privacidade`, `entrar`, `cadastro`, `ajuda`, `blog`, `app`), em `src/lib/reserved-slugs.ts`.

## Projeto base e clonagem
**Customizável por cliente** (sem tocar em lógica):
- Preset de vertical em `src/config/vertical.ts`, escolhido por `Business.businessType`: terminologia (Profissional → Barbeiro/Tatuador/Especialista; Serviço → Procedimento; Cliente → Paciente) e feature flags (portfólio, preço "a partir de", categorias; sinal e comissões na Fase 4). Textos visíveis usam os helpers com concordância (`newLabel`, `emptyLabel`, `selectLabel`…), nunca string fixa com o termo. Mensagens de erro da API ficam neutras ("Cadastro não encontrado").
- Marca do produto **Aprazzo** em `src/config/brand.ts` + tokens/fontes do design system (https://claude.ai/artifact/5EVQG5BRicTfK4M4X5AKNB) — separada da marca do negócio cliente (`Business.accentColor`/`logoUrl`), que substitui só a família `primary`. O nome é sempre "Aprazzo", com A maiúsculo.
- Identidade: logo, capa, cor de marca, textos (via Configurações do negócio no painel)
- Tokens do design system
- Seed de exemplo do nicho

**Nunca diverge entre clones**: lógica de disponibilidade, auth, isolamento multi-tenant, schema base.

Regras:
- Funcionalidade específica de um nicho entra **atrás de feature flag no preset**, nunca com `if (barbearia)` espalhado.
- Textos visíveis que dependem do nicho vêm da terminologia do preset, não de strings fixas.
- Existem projetos derivados deste repositório (ex.: SaaS-psi) que o usam como remoto `upstream`. Mantenha o base genérico para que melhorias possam ser puxadas pelos forks.

## Design system: regras duras
- Só tokens (CSS variables no `@theme`). **Nunca** cor hex, espaçamento ou sombra solta no componente.
- Cor de marca e logo vêm das configurações do negócio; garanta contraste AA do texto sobre a cor de marca.
- Detalhes de um registro abrem em **drawer**; **modal** só para confirmação ou ação curta; formulário longo vira página.
- Toda tela tem estado de **carregando (skeleton), vazio (com ação) e erro**.
- Página pública é **mobile-first**; painel é desktop-first, mas precisa funcionar no celular (navegação inferior, agenda em visão dia).
- Micro-interações com Motion, discretas, respeitando `prefers-reduced-motion`.
- Um único estilo de ícone (Lucide).
- Novos componentes de domínio entram também no style guide em `/admin/design-system`.

## Glossário do domínio
- **Business**: o negócio (tenant). **Professional**: quem atende. **Service**: o que é vendido (preço fixo ou "a partir de", duração, buffer). **Client**: cliente final, identificado principalmente pelo **telefone** (deduplicação por telefone, gravado **só com dígitos** via `normalizePhoneBR` em `insertAppointment`; exibição com `formatPhoneBR`). **Appointment**: atendimento marcado. **TimeBlock**: bloqueio de agenda (almoço, folga, férias). **WorkingHours**: padrão semanal em minutos desde meia-noite.
- **Status do agendamento**: agendado → confirmado → concluído; ou → falta; ou → cancelado. Concluído, falta e cancelado são estados finais (não voltam a agendado/confirmado; para remarcar, cria-se um novo ou usa-se o fluxo de reagendamento).
- **Pagamento**: o SaaS **não processa pagamentos**. O cliente paga fora (PIX, dinheiro, maquininha) e o sistema só **registra**: valor, desconto, forma, data de recebimento, observação. Suporta parcial e sinal. Status derivado: pendente / parcial / pago. Relatórios financeiros usam a **data de recebimento**.
- **Comissão**: % por profissional aplicada sobre o recebido no período. A % é **congelada em cada pagamento** (`Payment.commissionPercent`): mudar a % do profissional não reescreve o passado.
- **Valor do atendimento** (`Appointment.priceCents`): gravado na marcação a partir do preço do serviço; pode ser ajustado ao receber (ex.: preço "a partir de"). Status pago/parcial/pendente usa esse valor menos os descontos.

Nunca integrar gateway de pagamento sem pedido explícito.

## Contexto do usuário final (Brasil)
- Clientes chegam pelo link no WhatsApp ou Instagram, no celular. Ninguém quer baixar app nem criar conta.
- WhatsApp é o canal principal: mensagens prontas abrem via `wa.me`; a camada de envio fica isolada em `notification/whatsapp` para plugar API oficial no futuro.
- A prévia do link (Open Graph) no WhatsApp precisa mostrar logo e nome do negócio.
- Formatos pt-BR: R$ 1.234,56; dd/mm/aaaa; telefone com máscara brasileira; interface inteiramente em português.

## Standards
- TypeScript `strict: true`, sem `any` não justificado.
- Rotas públicas buscam por `slug`/`manage_token`, nunca por ID sequencial.
- Isolamento multi-tenant: toda query filtra por `businessId` **derivado da sessão**, nunca de valor vindo do client, nem confiando só no ID do recurso filho.
- Toda conversão de horário passa por `src/lib/date.ts`. `Appointment`/`TimeBlock` em `timestamptz` UTC.
- Lógica de disponibilidade com teste unitário cobrindo: sobreposição, timezone, duração variável, buffer, bloqueios, horário por profissional.
- Lógica de pagamentos, comissões e relatórios com teste unitário.
- Componentes seguem o design system; nada de CSS solto fora do Tailwind.
- Commits pequenos, Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `style:`).
- Nunca commitar `.env`, chaves ou strings de conexão.

## Common Commands
```
docker compose up -d        # Postgres local
npx prisma migrate dev      # aplica migrations em dev
npx prisma db seed          # dados de exemplo
npx prisma migrate reset    # zera o banco local e roda o seed de novo
npx prisma studio           # inspecionar dados
npm run dev                 # http://localhost:3000
npm run build
npm run lint
npm run test                # Vitest
npm run test:e2e            # Playwright
npm run novo-cliente -- clientes/<slug>.json [--simular] [--producao]   # cliente novo (docs/como-clonar.md)
```
Arquivos de ambiente (todos fora do git): `.env` (banco local), `.env.local` (token da Vercel criado pelo `vercel link`), `.env.vercel.local` (`vercel env pull`: credenciais do Blob) e `.env.producao.local` (`DATABASE_URL` do Neon, à mão). **Nunca `.env.production.local`**: o Next carrega esse nome sozinho no build/start local.
Pré-requisitos: Node ≥20.19, Docker.

**Dados de teste (só banco local):** admin `dono@navalhadeouro.com` / `senha123`; profissional `joao@navalhadeouro.com` / `senha123` (criado pelo seed; num banco antigo, convide pelo cadastro do João); página pública `/navalha-de-ouro`. Use-os para testar fluxos e tirar screenshots sozinho.

## Standard Workflow
1. Pergunta sobre o código ou mudança? Se for pergunta, investigue antes de propor código.
2. Mudança de schema, auth ou disponibilidade → plano primeiro, esperar confirmação.
3. Regra de negócio não descrita nos docs → pergunte antes de assumir.
4. Defina como validar (unitário ou E2E) antes ou junto da implementação.
5. Mudança de UI → verificar em desktop (1440px) e mobile (390px).

## Definition of Done
- `npm run lint`, `npm run test` e `npm run test:e2e` passando.
- Mudanças de UI: screenshots desktop e mobile via Playwright em `docs/screenshots/`.
- Estados de carregando, vazio e erro implementados.
- Acessibilidade: navegação por teclado, foco visível, labels, contraste AA.
- Nenhum valor visual fora dos tokens.
- Docs e este CLAUDE.md atualizados se a mudança alterar estrutura, regra de negócio ou fluxo de clonagem.

## Decisões intencionais (não "corrigir" sem pedido)
- Cliente final nunca tem conta; tudo pelo `manage_token` (UUID v4).
- Token inválido ou expirado retorna mensagem genérica (não revela se o agendamento existe). Token expira 30 dias após o atendimento. Rate limit de 20 req/5min por IP nas rotas com token.
- Conflito de horário garantido por exclusion constraint no Postgres (`EXCLUDE USING gist`, `btree_gist`); a checagem na aplicação é só otimista. Toda criação/remarcação (inclusive arrastar-e-soltar na agenda) revalida no servidor.
- Logout e troca de senha incrementam `User.tokenVersion`; access token não é revalidado no banco a cada request (janela curta aceita).
- Sessão deslizante de 7 dias: o `proxy.ts` renova em silêncio quando o access (15 min) some, usando o refresh (checado no banco e rotacionado a cada uso). Só pede senha após 7 dias sem uso. Lógica em `src/server/modules/auth/proxy-session.ts`.
- Reserva pública e reagendamento pelo link revalidam no servidor com `assertSlotAvailable` (`availability.ts`): só aceitam um horário que a própria disponibilidade ofereceria. O encaixe pelo painel segue outra regra (`admin-booking-rules.ts`: pode encaixar fora do expediente com confirmação).
- Políticas de reserva (`Business.minBookingNoticeMinutes`, `maxBookingWindowDays` padrão 60, `cancellationDeadlineHours`) valem só para quem agenda sem login: entram em `getAvailableSlots` (antecedência vira o "agora", datas além da janela não têm horário) e o prazo de cancelamento é checado no link de gerenciar (`booking-policy.ts`). O painel não passa por elas. Os E2E buscam horário livre dentro da janela (`findFreeSlot`).
- O nicho (`Business.businessType`) vem pronto no clone: é definido na criação do cliente (seed / script da Fase 7) e aparece só para leitura em Configurações; a API ignora `businessType`. Trocar é tarefa do suporte (banco/seed).
- Slug e fuso do negócio não são editáveis em Configurações: trocar o slug quebra links já compartilhados; trocar o fuso deslocaria a agenda gravada. `BusinessWorkingHours` é só informativo (página pública); a disponibilidade vem do expediente de cada profissional.
- WhatsApp sem API: o dono envia pelo próprio WhatsApp via link `wa.me` com o texto pronto; "enviado" (`MessageLog`) é marcado quando ele abre o link, e pode ser desmarcado. Os links são montados antes do clique (abrir depois de um fetch seria bloqueado como pop-up). Para plugar a API oficial, trocar a implementação de `WhatsAppSender` (`notification/whatsapp/sender.ts`). Links para o cliente usam `APP_BASE_URL` (`src/server/app-url.ts`).
- Troca de senha exige a senha atual, derruba as outras sessões (`tokenVersion`) e reemite os cookies da sessão atual.
- **Equipe (dono + profissionais):**
  - o profissional vê e mexe só na própria agenda e nos próprios clientes (clientes com algum agendamento com ele);
  - pode confirmar, concluir, marcar falta, cancelar, remarcar e registrar pagamento, **sem** desconto nem mudar o valor;
  - Financeiro, Relatórios, Configurações do negócio, cadastros, modelos de mensagem, remover pagamento e convites são só do dono.
  - Rotas: `requirePermission(...)`, `professionalScope(access)` nas listas e `requireAppointmentAccess` nos agendamentos (`auth/appointment-access.ts`). Agendamento/cadastro de colega responde **404**, como se não existisse.
  - Páginas de dono usam `requirePagePermission` (volta ao Início). O menu vem filtrado por `useAdminAccess()`.
- **Cliente atendido por dois profissionais:** um cadastro só (telefone). Cada profissional vê só o próprio histórico, sem o total gasto. Notas e tags são compartilhadas, com "editado por". O profissional não renomeia cadastro existente, e a busca por telefone não revela cliente de colega.
- **Convite da equipe:** link com token aleatório (no banco só o sha256), 7 dias, uso único (`StaffInvite`), enviado pelo dono (WhatsApp/copiar). Página `/admin/convite/[token]` fora do proxy de sessão. Revogar grava `User.disabledAt` + `tokenVersion`: o acesso cai em até 15 min (mesma janela do access token).
- **Primeiro acesso do dono:** o mesmo convite, com `StaffInvite.role = OWNER` e sem `professionalId`, gerado por `npm run novo-cliente` (`createOwnerInvite`). O dono escolhe o próprio e-mail e senha; ninguém cria nem vê a senha dele. Um link novo invalida o anterior não usado.
- **Cliente novo = negócio cadastrado, não código copiado** (multi-inquilino). Logo e capa vão para o Vercel Blob (pasta `clientes/<slug>/`; testes locais em `local/`). O comando recusa `--producao` com banco local e o contrário.
- **Demonstração** (`Business.isDemo`, `novo-cliente --demo [--permanente]`): demo pública em `/demo` e prévias por prospect (`<slug>-demo`, `demoExpiresAt` = 7 dias). Só por link (`noindex`, nenhum botão no site leva a ela).
  - Painel sem senha pelo botão da página (`POST /api/public/demo/[slug]/entrar`, só em demo ativa, limite por IP), como um OWNER "Visitante" com senha aleatória descartada e e-mail `.invalid`.
  - O bloqueio NÃO está no token nem na matriz de permissões: `assertNotDemo(businessId)` (uma leitura no banco) nas rotas que mudariam a demo para todos — configurações e horário, senha, modelos de mensagem, convites, editar/apagar profissional, apagar/esconder serviço. A tela mostra a mensagem da API.
  - Reserva pública na demo não envia e-mail. `resetDemoData` recusa negócio que não seja demo (apaga dados).
  - Vercel Cron diário (`vercel.json`, 06:00 UTC = 03:00 BRT) chama `/api/cron/demos` com `CRON_SECRET`: apaga prévias vencidas e recria os dados das demos. Agendamentos são apagados antes do negócio (FK `Restrict`).
- **"Quem fez":** `Appointment.createdByUserId`/`cancelledByUserId`, `Payment.createdByUserId`, `Client.notesUpdatedByUserId`. Registros antigos ficam sem autor e a tela não mostra a linha (não dá para distinguir "página pública" de "antes do controle").
- Rate limit em memória via `globalThis`: funciona só em instância única. Limitação conhecida; Redis/Upstash só quando pedido.

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
