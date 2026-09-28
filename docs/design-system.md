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

## Shell do painel (Fase 3B)

`src/components/admin/`: `AdminShellProvider` (contexto com `openNewAppointment`, `openSearch` e `appointmentsVersion` — telas que listam agendamentos recarregam quando ele muda), `AdminSidebar` (recolhível; preferência no cookie `admin-sidebar`, lido no layout para não piscar), `AdminTopbar` (busca, "+ Novo agendamento", tema, conta), `AdminBottomNav` (celular: Início, Agenda, "+", Clientes, Mais), `CommandPalette` (Ctrl/Cmd+K; busca clientes, próximos agendamentos e telas), `NewAppointmentDialog` global e `ComingSoon` para telas ainda não construídas. O menu vem de `useAdminNav()` e usa os termos do preset.

Armadilha registrada: constantes lidas pelo servidor (ex.: nome do cookie) não podem ser exportadas de arquivo `"use client"` — no servidor viram "referência de cliente", não o valor. Ficam em módulo neutro (`sidebar-cookie.ts`).

Cor de marca do negócio: `AccentColorScope` injeta as variáveis em `:root`, porque diálogos, gavetas e toasts são renderizados em portal no `<body>` e ficariam fora de uma div com estilo.

## Agenda (Fase 3C)

`src/app/admin/(authenticated)/agenda/`:
- `ScheduleGrid` recebe colunas genéricas (`GridColumn`): visão **Dia** = uma coluna por profissional; visão **Semana** = sete colunas de um profissional.
- Blocos de agendamento usam `STATUS_BLOCK_CLASSES` (fundo suave opaco + faixa `border-l-4` na cor `--status-*`). Blocos com menos de 56 px viram uma linha só ("hora · cliente").
- Bloqueios (`TimeBlock`) são hachurados. Fora do expediente e intervalo ficam com fundo `muted`.
- Linha do "agora" em `--destructive`, só na coluna de hoje, atualizada a cada minuto.
- Clique no vazio abre "Novo agendamento" já preenchido (profissional, data, hora com snap de 15 min).
- Arrastar (`@dnd-kit/core`, só desktop) remarca com atualização otimista:
  - soltar em bloqueio é recusado com toast;
  - fora do expediente pede confirmação num modal curto;
  - o servidor revalida tudo (`PATCH /api/admin/appointments/[id]`), e o conflito é garantido pela exclusion constraint.
- Detalhe do agendamento abre no drawer `AppointmentDrawer`: status, cliente com WhatsApp, histórico, ações de status e "Remarcar" (formulário embutido).
- No celular, a grade vira `AgendaDayList`: lista do dia com abas por profissional; toque abre o mesmo drawer.
- Regras de horário do painel ficam em `src/server/modules/appointment/admin-booking-rules.ts`. É um módulo puro, usado no servidor e na tela.
  - **Passado**: início até 15 min atrás é aceito (encaixe que acabou de começar); antes disso é recusado.
  - Na grade, o tempo que já passou fica sombreado. Clique ou arraste para lá dá toast de erro.
- **Fora do expediente** (dia sem expediente, fora do horário ou no intervalo) só entra com confirmação explícita:
  - no formulário (novo agendamento e "Remarcar"), `BookingTimeNotice` mostra um alerta `warning` e o botão vira "Agendar/Remarcar mesmo assim";
  - no arrastar, o modal curto "Fora do expediente";
  - a API recusa com `code: "OUTSIDE_WORKING_HOURS"` se não vier `allowOutsideHours: true`.
- **Cancelar** passa por modal de confirmação (estado final). O agendamento cancelado continua visível na agenda, riscado.

## Cadastros (Fase 3D)

- **Clientes** (`/admin/clientes`):
  - `Table` + `TableToolbar` no desktop; lista de cartões no celular (tabela não cabe em 390px).
  - Busca e filtro ficam na URL (`?q=`, `?filtro=sumidos-60`, `?cliente=<id>` abre a ficha). Assim o Início e o Ctrl+K levam direto à lista filtrada ou à ficha.
  - A ficha abre em drawer: notas internas, tags (Enter ou vírgula adiciona), histórico, WhatsApp e "Novo agendamento" já preenchido.
  - Regras puras em `src/server/modules/client/client-rules.ts`.
- **Telefone já cadastrado no encaixe**: ao digitar um telefone conhecido, o formulário mostra "Já cadastrado: Nome" e preenche o nome. Se o nome for trocado, avisa que o cadastro será renomeado e oferece "Manter". O campo WhatsApp vem antes do nome, porque é ele que identifica o cliente.
- **Profissionais**: cards levam ao perfil `/admin/profissionais/[id]`, com abas Próximos · Desempenho (métricas do Início para uma pessoa) · Dados.
  - O cadastro é página, não diálogo (formulário longo), e também existe em `/admin/profissionais/novo`.
  - Remover passa por modal de confirmação. Para só pausar, use "Ativo".
- **Cor do profissional**: paleta fixa de tokens `--pro-*` (claro/escuro) em `globals.css`, mapeada em `src/lib/professional-colors.ts`.
  - `Professional.color` guarda só a chave, nunca hex.
  - `ProfessionalAvatar` desenha o anel na cor: cards, perfil, cabeçalho da agenda e marcador na visão semana.
- **Serviços**: tabela por categoria, na mesma ordem da página pública (categoria → `position` → nome).
  - Subir/descer troca com o vizinho da mesma categoria (`service-order.ts`, testado).
  - "Na página" (`visibleOnline`) esconde o serviço da página pública e bloqueia a reserva pública pela API. O serviço oculto continua disponível para encaixe no painel.
  - Ações da linha no menu "…"; remover pede confirmação.

## Pagamentos (Fase 4B)

- **Seção Pagamento no drawer do agendamento** (`agenda/appointment-payments.tsx`):
  - badge pendente/parcial/pago (tokens `--payment-*`, mapa em `src/lib/payment-status.ts`);
  - três quadrinhos Valor · Recebido · Falta;
  - lista de recebimentos. Um registro só de desconto aparece como "Desconto de R$ X", sem forma de pagamento.
  - Remover recebimento pede confirmação (modal).
- **`PaymentForm`** (`src/components/admin/payment-form.tsx`), reusado no Financeiro:
  - campos: valor do atendimento (ajustável), recebido (padrão = saldo), desconto, data (máximo hoje), forma em chips (`role="radio"`) e observação;
  - prévia ao vivo de quanto ainda falta;
  - uma coluna no celular, duas a partir de `sm`.
- **"Concluir" abre "Concluir e receber"** (uma transação no servidor), com "Só concluir" para receber depois.
- **`MoneyInput`** (`src/components/money-input.tsx`): valor em R$ guardado em centavos inteiros; os dígitos entram pela direita, como em maquininha.
- **`PaymentIndicator`**: ícone discreto nos concluídos da agenda (grade e lista) — check = pago, cifrão = falta receber —, com `aria-label`.
- **Acessibilidade na grade**: só blocos arrastáveis recebem os atributos do dnd-kit. Nos demais, ele marcava `aria-disabled="true"` num botão que continua clicável.

## Financeiro (Fase 4C)

- **`/admin/financeiro`**:
  - período (Hoje · Últimos 7 dias · Este mês · Mês passado · Personalizado) guardado na URL (`?periodo=&inicio=&fim=&aba=`); regra pura em `financeiro/period.ts`;
  - tudo **pela data de recebimento**.
- **KPIs** (`KpiCard`): Recebido no período, A receber (total atual, com contagem), Ticket médio e Descontos.
- **Barras "Por forma de pagamento"**: largura proporcional ao maior valor (`style` só para o dado dinâmico). No celular a contagem sai para a barra caber.
- **Abas:**
  - **Recebimentos**: filtro por forma e profissional; tabela no desktop, cartões no celular.
  - **A receber**: concluídos com saldo, com botão "Receber".
  - **Comissões**: só com `features.commissions`; % atual, recebido e comissão, com total.
- Clicar num recebimento ou em "Receber" abre o **mesmo drawer do agendamento**. A lista de profissionais vem de `agenda/professional-options.ts`, compartilhado com a Agenda.
- **Comissão no cadastro do profissional**: campo "%" (0–100) na aba Dados, só com o flag. O texto explica que mudar vale só para os próximos pagamentos.

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

`src/components/`: `status-badge.tsx`, `kpi-card.tsx`, `empty-state.tsx`, `detail-drawer.tsx`, `stepper.tsx`, `service-card.tsx`, `professional-card.tsx`, `selectable-card.tsx` (base dos dois anteriores), `time-slot-grid.tsx`, `table-toolbar.tsx`, `skeletons.tsx`, `date-strip.tsx`. Todos demonstrados com dados de exemplo em `/admin/design-system`.

**Aplicados na Fase 2** (página pública): `ServiceCard`, `ProfessionalCard`, `Stepper`, `TimeSlotGrid`, `DateStrip` — já em uso real no fluxo de reserva (`src/app/[slug]/`).

**Aplicados na Fase 3**: `KpiCard` e `StatusBadge` (Início, Relatórios, Agenda), `DetailDrawerContent` (drawer do agendamento). `TableToolbar` e os skeletons compostos aguardam Clientes (3D) e Financeiro (Fase 4).

**Decisão registrada (2026-09-25), implementada na Fase 2**: o escopo original (`docs/escopo-sistema-agendamento.md`) e o pedido de Fase 1 descreviam um "seletor de data em faixa horizontal" (estilo Fresha), enquanto a implementação anterior (`month-calendar.tsx`, commit `a349faa`) usava um calendário de mês inteiro. O usuário confirmou a troca; `DateStrip` (`src/components/date-strip.tsx`) substituiu `MonthCalendar` em `src/app/[slug]/datetime-step.tsx`, e os arquivos antigos (`month-calendar.tsx`, `month-grid.ts`, `tests/unit/month-grid.spec.ts`) foram removidos.

## Como trocar a identidade para um novo cliente

Hoje (antes da Fase 7 formalizar o processo completo em `docs/como-clonar.md`):
1. `Business.name`, `Business.accentColor`, `Business.logoUrl` — únicos campos de identidade que já existem no banco. Ainda sem tela de Configurações; editar via seed ou Prisma Studio.
2. Contraste do texto sobre a cor de marca é calculado automaticamente (`getAccentForeground`, `src/lib/accent-color.ts`) — não precisa ajustar manualmente.
3. Terminologia e recursos do nicho: `Business.businessType` escolhe o preset em `src/config/vertical.ts` (barbershop, beauty_clinic, tattoo_studio, generic). Troca "Profissional/Serviço/Cliente" em todas as telas, no e-mail e no menu, e liga/desliga portfólio, preço "a partir de" e categorias.

## Marca do produto (a plataforma) vs. marca do cliente

Duas camadas independentes:
- **Marca do produto** — `src/config/brand.ts` (nome, logo, "feito com") + tokens de `globals.css` (cores neutras, fonte, raio). Aparece no login, no título da aba do painel, no rodapé "feito com" da página pública e nos `.ics`. Para aplicar a identidade final: trocar `BRAND`, os tokens base (claro e escuro), a fonte em `src/app/layout.tsx`, `DEFAULT_ACCENT_COLOR` em `src/lib/accent-color.ts` e o favicon; conferir tudo em `/admin/design-system`.
- **Marca do cliente** — `Business.accentColor`/`logoUrl`, aplicada via `AccentColorScope` sobre `--primary` no painel e na página pública.
