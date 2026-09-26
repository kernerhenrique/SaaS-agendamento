# Design System

> Fase 1 do plano de evolução (`docs/plano-implementacao.md`). Style guide vivo em `/admin/design-system` — este documento explica os tokens e quando usar cada padrão; o componente é a fonte da verdade visual.

## Princípios

- **Só tokens.** Nenhuma cor hex, espaçamento ou sombra solta em componente — tudo vem de CSS variables no `@theme` de `src/app/globals.css`.
- **Paleta neutra + cor de marca configurável.** A cor de marca do negócio (`Business.accentColor`) sobrescreve `--primary`/`--ring`/`--sidebar-primary` via `AccentColorScope` (`src/components/accent-color-scope.tsx`) — nenhum componente precisa saber a cor do negócio, só usar `bg-primary`/`text-primary` normalmente.
- **Poucas cores semânticas.** `success`, `warning`, `info` (mais o `destructive` já existente) cobrem todo feedback — evite inventar uma cor nova para cada caso de uso.
- **Componentes descrevem o papel, não o valor.** Ex.: `text-page-title` em vez de `text-2xl font-bold` direto — o nome muda de sentido junto se a escala mudar.

## Tokens

### Cores

| Token | Uso |
|---|---|
| `--primary` / `--primary-foreground` | Cor de marca do negócio (ação principal, foco) |
| `--secondary`, `--muted`, `--accent` | Neutros de apoio |
| `--destructive` | Erro / ação destrutiva |
| `--success`, `--warning`, `--info` | Feedback positivo / atenção / neutro-informativo (toasts, alertas, validação) |
| `--status-scheduled` `--status-confirmed` `--status-completed` `--status-cancelled` `--status-no-show` | Status de agendamento — aliases sobre as cores semânticas acima (ver `src/components/status-badge.tsx`) |
| `--payment-pending` `--payment-partial` `--payment-paid` | Status de pagamento (módulo Financeiro, Fase 4) — mesmos aliases |

Todos os tokens de cor viram utilitário Tailwind automaticamente (`bg-success`, `text-status-confirmed/10` etc.) via o mapeamento em `@theme`. Para uma badge "suave" (fundo tênue + texto colorido), o padrão do projeto é `border-<token>/30 bg-<token>/10 text-<token>` — nunca fundo sólido + texto branco em badge (isso é reservado para blocos de calendário, um padrão à parte).

### Tipografia

`text-display` (2,5rem — hero/landing), `text-page-title` (1,5rem — título de tela, equivalente ao antigo `text-2xl`), `text-section-title` (1,125rem — título de card/seção, equivalente a `text-lg`), `text-caption` (0,75rem — legenda/meta, equivalente a `text-xs`). `text-base`/`text-sm` do Tailwind continuam sendo o corpo de texto padrão — não precisam de alias próprio.

### Raio e sombra

Raio já era tokenizado (`--radius-sm` a `--radius-4xl`, derivados de `--radius`). Sombra usa a escala padrão do Tailwind (`shadow-sm` … `shadow-2xl`); a única sombra nomeada extra é `shadow-fixed-bar`, para elementos fixos flutuantes (ex.: barra de resumo fixa no rodapé mobile do fluxo de reserva) — nunca escrever um valor de sombra arbitrário (`shadow-[...]`) num componente.

### Movimento

`src/lib/motion.ts` exporta `MOTION_DURATION` (fast/base/slow, em segundos) e `MOTION_EASE` (standard/decelerate/accelerate) para uso com a lib `motion`. Sempre checar `prefers-reduced-motion` (hook `useReducedMotion` da lib) antes de animar algo que não seja puramente decorativo.

## Quando usar drawer vs. modal vs. página

- **Drawer** (`Sheet` + `DetailDrawerContent`, `src/components/detail-drawer.tsx`): detalhe de um registro existente (agendamento, cliente, profissional) — mantém a lista de fundo visível/no contexto.
- **Modal** (`Dialog`): confirmação ou ação curta (ex.: "excluir este serviço?"), nunca para mostrar detalhe extenso.
- **Página própria**: formulário longo ou fluxo de várias etapas (ex.: os formulários de Profissional/Serviço já são página/dialog grande o suficiente para virar página quando ganharem mais campos — reavaliar caso a caso).

## Padrões de tabela

`Table` (shadcn) + `TableToolbar` (`src/components/table-toolbar.tsx`, busca + slot de filtros) para toda listagem nova (Clientes, Financeiro). Ações por linha agrupadas num único `DropdownMenu` com ícone "..." no fim da linha — nunca vários ícones soltos por linha. Ver exemplo completo em `/admin/design-system` (aba Componentes → "Tabela com filtro").

## Padrões de estado

Toda tela busca de dados precisa dos três estados:
- **Carregando**: `Skeleton` (`CardSkeleton`/`TableRowsSkeleton` em `src/components/skeletons.tsx`, ou composições próprias no mesmo espírito).
- **Vazio**: `EmptyState` (`src/components/empty-state.tsx`) — ícone, título, descrição curta e uma ação quando fizer sentido (ex.: "+ Novo cliente").
- **Erro**: mensagem curta e acionável (retry quando possível); usar `toast.error` (Sonner) para erros de submissão/rede, e texto inline (`text-sm text-destructive`) para erro de validação de campo — não confundir os dois.

## Componentes de domínio disponíveis

`src/components/`: `status-badge.tsx`, `kpi-card.tsx`, `empty-state.tsx`, `detail-drawer.tsx`, `stepper.tsx`, `service-card.tsx`, `professional-card.tsx`, `selectable-card.tsx` (base dos dois anteriores), `time-slot-grid.tsx`, `table-toolbar.tsx`, `skeletons.tsx`. Todos demonstrados com dados de exemplo em `/admin/design-system`.

**Ainda não aplicados às telas reais** — nascem como extração fiel do que já existe (ex.: `KpiCard` replica o `StatTile` hoje local em `relatorios/reports-view.tsx`; `StatusBadge` generaliza o badge hoje montado ad-hoc com `STATUS_BADGE_CLASSES`). Substituir as duplicatas locais pelos componentes compartilhados é o primeiro passo de quando cada tela for revisitada (Fase 2/3), não desta fase.

**Decisão registrada (2026-09-25)**: o escopo original (`docs/escopo-sistema-agendamento.md`) e o pedido de Fase 1 descreviam um "seletor de data em faixa horizontal" (estilo Fresha), enquanto a implementação atual (`month-calendar.tsx`, commit `a349faa`) usa um calendário de mês inteiro. O usuário confirmou: **trocar para faixa horizontal** — a construir na Fase 2, substituindo `MonthCalendar` no fluxo de reserva (`src/app/[slug]/datetime-step.tsx`).

## Como trocar a identidade para um novo cliente

Hoje (antes da Fase 7 formalizar o processo completo em `docs/como-clonar.md`):
1. `Business.name`, `Business.accentColor`, `Business.logoUrl` — únicos campos de identidade que já existem no banco. Ainda sem tela de Configurações; editar via seed ou Prisma Studio.
2. Contraste do texto sobre a cor de marca é calculado automaticamente (`getAccentForeground`, `src/lib/accent-color.ts`) — não precisa ajustar manualmente.
3. Terminologia por vertical (Profissional→Barbeiro, Serviço→Procedimento etc.) ainda não existe (`src/config/vertical.ts` é trabalho da Fase 6/7) — hoje todo texto é fixo em português para o caso "barbearia".
