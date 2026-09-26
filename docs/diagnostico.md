# Diagnóstico — Estado Atual vs. CLAUDE.md

> Levantamento da Fase 0 (projeto base comercial). Reflete o código em `C:\Claude\code\projeto-1` em 2026-09-25. Screenshots de referência em `docs/screenshots/antes/`.

## 1. Visão geral do gap

O `CLAUDE.md` da raiz já foi reescrito para a visão-alvo do produto: SaaS multi-tenant clonável, com módulo de pagamentos/comissão, preset de vertical (`src/config/vertical.ts`) e painel admin com 9 seções (Início, Agenda, Clientes, Profissionais, Serviços, Financeiro, Relatórios, Mensagens, Configurações).

O código, porém, ainda reflete o **MVP original de portfólio** descrito em `docs/escopo-sistema-agendamento.md`: a base técnica (schema, disponibilidade, autenticação, isolamento multi-tenant) é sólida e está testada, mas o produto tem só 4 das 9 seções do admin, não tem nenhuma noção de pagamento/comissão, e não tem nenhuma camada de personalização por vertical. As seções abaixo detalham essa distância área por área.

## 2. Schema Prisma atual

### 2.1 Modelos existentes

`Business` (tenant), `User` (role só `OWNER`), `Professional` (nome, 1 foto, bio, ativo), `WorkingHours` (1 turno + 1 intervalo de almoço por profissional/dia da semana), `Service` (nome, descrição, duração, preço fixo em centavos), `ProfessionalService` (N:N puro), `TimeBlock` (bloqueio manual), `Client` (dedup por telefone único por negócio), `Appointment` (com **exclusion constraint** `EXCLUDE USING gist` no Postgres garantindo não-sobreposição de horário por profissional — migration `20260924041714_add_no_overlap_constraint`), `Review` (nota + comentário pós-atendimento).

Timezone tratado centralmente em `src/lib/date.ts` (conversões via `date-fns-tz`, campos `Appointment`/`TimeBlock` em `timestamptz(6)`).

### 2.2 Lacunas confirmadas

Nenhum destes existe hoje no schema:

- **Pagamento**: nenhum model `Payment`. "Financeiro" é 100% aspiracional — não há como registrar valor recebido, forma de pagamento, desconto, data de recebimento, sinal ou pagamento parcial.
- **Comissão**: nenhum campo de percentual em `Professional` nem em `Business`.
- **Portfólio de fotos**: `Professional.photoUrl` é uma foto só (avatar), sem galeria.
- **Categoria de serviço e preço "a partir de"**: `Service` não tem `categoryId` nem flag de tipo de preço; `priceCents` é sempre um valor fixo.
- **Políticas de reserva e horário geral do negócio**: `Business` não tem antecedência mínima, janela máxima futura, prazo de cancelamento, texto de políticas, nem um horário de funcionamento geral (só existe `WorkingHours` por profissional).
- **Tags/notas de cliente**: `Client` não tem campo de notas internas nem tags.
- **Preset de vertical**: nenhuma coluna em `Business` guarda o vertical escolhido; o conceito não existe em lugar nenhum do banco ou do código.
- **Snapshot de preço no agendamento**: `Appointment` não guarda o preço vigente do serviço no momento da reserva — hoje ele é sempre lido de `Service.priceCents`, então editar o preço de um serviço no futuro reescreveria retroativamente o valor de agendamentos passados (problema real para quando o Financeiro existir).

## 3. Módulos de servidor (`src/server/modules/`)

| Módulo | Estado |
|---|---|
| `appointment/` | Completo: disponibilidade (`availability.ts`), criação, transições de status (máquina de estados explícita: PENDING→{CONFIRMED,CANCELLED}; CONFIRMED→{COMPLETED,CANCELLED,NO_SHOW}; estados finais sem saída), cancelamento/reagendamento por `manageToken`, avaliação pós-atendimento. |
| `auth/` | Completo: JWT access (15min) + refresh (7d) via `jose`, bcrypt, `tokenVersion` para revogar refresh tokens em logout/troca de senha. Só existe papel `OWNER` — sem login de profissional. |
| `professional/` | CRUD completo, incluindo horários de trabalho e bloqueios. Sem portfólio, sem comissão. |
| `service/` | CRUD completo. Sem categorias, sem preço "a partir de". |
| `report/` | `getReportSummary` (totais, taxa de cancelamento/no-show, profissional mais requisitado, série diária) e `countByLocalDay`. Sem nada financeiro (receita, comissão). |
| `notification/` | Só `email.ts` (Nodemailer/Gmail; sem credenciais, só loga no console). **Não existe** `notification/whatsapp/`, apesar de o CLAUDE.md descrever essa camada como isolada para plugar API oficial no futuro. Só e-mail de confirmação existe — não há e-mail de cancelamento, reagendamento ou lembrete. |
| `payment/` | **Não existe.** Nenhum arquivo, nenhuma rota. |

## 4. Configuração de vertical

`src/config/vertical.ts` **não existe** — o diretório `src/config/` inteiro não existe no repositório. Não há preset de terminologia (Profissional→Barbeiro/Tatuador/Especialista, Serviço→Procedimento, Cliente→Paciente) nem feature flags por vertical (portfólio, sinal, comissão, preço "a partir de"). A terminologia hoje está hardcoded em português para o caso "barbearia". Também não existem seeds por vertical — só `prisma/seed.ts`, genérico.

## 5. Painel admin

### 5.1 Navegação atual vs. alvo

Navegação real (`nav-links.tsx`): **Agenda, Profissionais, Serviços, Relatórios** — 4 itens. O CLAUDE.md descreve 9: Início, Agenda, Clientes, Profissionais, Serviços, Financeiro, Relatórios, Mensagens, Configurações.

### 5.2 Telas ausentes

- **Início**: `/admin` só faz `redirect("/admin/agenda")` — não existe dashboard com números do dia.
- **Clientes**: não existe. O model `Client` existe no banco (criado automaticamente pela reserva pública), mas não há nenhuma tela para listar, filtrar ou editar clientes, nem ficha de histórico/notas/tags.
- **Financeiro**: não existe (reflexo direto da ausência do model `Payment`).
- **Mensagens**: não existe. Nenhuma UI de modelos de mensagem para WhatsApp.
- **Configurações**: não existe como tela. `accentColor` e `logoUrl` do negócio só são editáveis hoje via seed/Prisma Studio direto no banco — confirma a suspeita de que a identidade visual do negócio não tem formulário admin.

### 5.3 Telas existentes — nível de acabamento

- **Agenda** (`/admin/agenda`): grade por profissional (colunas) x hora (linhas), só visão de **dia** (setas anterior/próximo + "Hoje"); não há alternância dia/semana. Tem skeleton de loading, erro inline, dialog de criar agendamento, ações rápidas de status. Responsiva.
- **Profissionais** / **Serviços**: cards em grid + dialog de criar/editar. Empty state só textual (sem ilustração/CTA destacado), sem skeleton de loading (dado vem do server component).
- **Relatórios**: mais elaborada — filtro de período, stat tiles, gráficos (coluna diária + barra por profissional) com tabela alternativa, loading e erro tratados.

## 6. Página pública (`/{slug}`) e gerenciamento

### 6.1 Fluxo de reserva — já segue o padrão Fresha

5 passos (serviço → profissional → data/hora → contato → confirmação) via state machine client-side, com **resumo sempre visível**: coluna lateral `sticky` no desktop, barra fixa no rodapé no mobile — exatamente o padrão pedido no escopo. Calendário mensal próprio, grade de horários com skeleton de carregamento, confirmação com `.ics` para download.

**Gap encontrado**: a tela de confirmação (`confirmation-step.tsx`) não mostra nenhum link direto para a página de gerenciamento — só o botão de baixar o `.ics`. O link de gerenciar só é enviado por e-mail (`confirmation-email.ts`). Isso diverge do que o escopo original descreve ("Confirmação caprichada: [...] link para gerenciar").

### 6.2 Gerenciamento (`/agendamento/{token}/gerenciar`)

Funcional (cancelar, reagendar, avaliar pós-atendimento), mas mais cru visualmente. **Inconsistência de design system**: `manage-view.tsx` usa `<button>` HTML puro com classes Tailwind manuais em vez do componente `Button` do shadcn usado no resto do app.

## 7. Design system

### 7.1 Componentes shadcn/ui

Presentes (11): `avatar`, `badge`, `button`, `card`, `checkbox`, `dialog`, `input`, `label`, `select`, `skeleton`, `textarea`.

Ausentes, mas necessários para o roadmap: **Drawer/Sheet** (o CLAUDE.md exige drawer para detalhe de registro; hoje tudo usa `Dialog`/modal), **Table**, **Tabs**, **Tooltip**, **Popover**, **DropdownMenu**.

Não há componente `StatusBadge` reutilizável — `STATUS_BADGE_CLASSES`/`STATUS_LABELS` (`src/lib/appointment-status.ts`) são usados ad-hoc em cada tela.

### 7.2 Tokens (`src/app/globals.css`)

Tailwind v4 com `@theme inline`, cores em `oklch()`, **dark mode completo** (`.dark`, toggle funcional), sistema de `radius` tokenizado. Faltam: tokens de tipografia (escala de tamanho/peso — hoje é só utilitário Tailwind padrão) e tokens de sombra (`--shadow-*` não existe — há pelo menos uma sombra com valor arbitrário inline no rodapé fixo mobile do fluxo de reserva, contra a regra dura do projeto de nunca ter valor visual fora de token).

### 7.3 Dependências citadas no CLAUDE.md mas ausentes do `package.json`

`sonner` (toasts) e `motion` (micro-interações) constam na stack descrita no CLAUDE.md mas **não estão instalados**. Hoje toda confirmação/erro de formulário é `<p className="text-destructive">` inline; não há nenhuma micro-interação além de transições CSS simples.

## 8. Testes

`npm run test` (50 testes, 7 arquivos) e `npm run lint` passam hoje, sem alterações.

| Arquivo | Cobre |
|---|---|
| `availability.spec.ts` | `computeSlotsForProfessional`: duração, grade de 15min, almoço, overlap com agendamento/bloqueio existente, horário já passado |
| `date.spec.ts` | Conversões de timezone, DST |
| `auth.spec.ts` | Hash de senha, JWT access/refresh |
| `accent-color.spec.ts` | Normalização da cor de marca e contraste |
| `schedule-grid-math.spec.ts` | Matemática de posicionamento da grade da agenda |
| `month-grid.spec.ts` | Grade do calendário mensal |
| `report.spec.ts` | `countByLocalDay` |

**Lacunas**: `getAvailableSlots` (a função de orquestração, não só a parte pura) não tem teste isolado próprio; `getReportSummary` como um todo (taxas, ranking) também não. Nenhum teste de pagamento/comissão — natural, já que o módulo não existe.

## 9. Documentação

Existe hoje: só `docs/escopo-sistema-agendamento.md` (documento original, ainda com framing de portfólio).

Referenciados pelo `CLAUDE.md` mas ainda **não criados**: `docs/design-system.md` (a ser criado na Fase 1), `docs/como-clonar.md` (Fase 7), `docs/pesquisa-referencias.md` (criado nesta Fase 0, ver arquivo separado).

Também existe `docs/erros/erro1.png`, solto e não versionado — screenshot de um bug de posicionamento na agenda já corrigido pelo commit `d2ccc5e fix(agenda): posiciona agendamentos no horário local correto`. Não relacionado a esta tarefa; mantido como está.

## 10. Achado operacional da Fase 0 (fora do escopo do produto)

O projeto foi movido de `C:\Claude\1.Cursos\...\projeto-1` para `C:\Claude\code\projeto-1` antes desta sessão. Isso quebrou o Prisma Client gerado (`src/generated/prisma`), que embutia o caminho antigo e não localizava o motor de banco (`query_engine-windows.dll.node`) no novo caminho — `npm run dev` retornava 500 em todas as páginas que tocam o banco. Corrigido rodando `npx prisma generate` no caminho atual. **Sempre que o projeto for movido de pasta, rodar `npx prisma generate` de novo antes de testar.**

## Anexo — Screenshots do estado atual

Capturados em `docs/screenshots/antes/` (desktop 1440px + mobile 390px): login admin, redirect de `/admin`, Agenda (+ dialog de novo agendamento), Profissionais (+ form), Serviços (+ form), Relatórios; os 5 passos do fluxo público de reserva; gerenciamento com agendamento confirmado e com agendamento concluído + avaliação.
