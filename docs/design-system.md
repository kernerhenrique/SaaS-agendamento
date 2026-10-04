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
- **Antes do horário** o rodapé do drawer só tem Cancelar e Remarcar (e Confirmar nos antigos "Agendado"), com a frase "Concluir e “Não compareceu” ficam disponíveis a partir do horário do atendimento" (`status-rules.ts`).
- **Avisar o cliente**: depois de cancelar ou remarcar pelo drawer, quadro `info` "Avise {nome}…" com o link wa.me do modelo Cancelamento/Remarcação (`NotifyClientPrompt`) e "Agora não"; depois de um encaixe, o toast "Agendamento criado." traz a ação "Avisar pelo WhatsApp" (texto de Confirmação).
- **Outros agendamentos do cliente** em duas listas, "Agendamentos futuros" (o próximo primeiro) e "Agendamentos passados" (`AppointmentHistoryLists`, também na ficha do cliente).
- **Pagamento**: o selo diz "A receber" (não "Pendente"). Cancelado não tem "falta receber" nem "Registrar pagamento"; se havia sinal, mostra só o recebido.

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

## Financeiro nas outras telas (Fase 4D)

- **Início:**
  - KPIs "Recebido no mês" e "A receber (N)" são clicáveis e levam ao Financeiro;
  - no quadro "Atenção", dois alertas levam a Financeiro › A receber: **vermelho** (`destructive`) para concluídos sem nenhum pagamento, com o valor; **amarelo** (`warning`) para pagamento parcial, com quanto falta. O `Alert` do Início aceita `tone`.
- **Ficha do cliente:** "Total gasto" (soma do que foi recebido) em grade 2×2 com Atendimentos, Faltas e Última visita.
- **Perfil do profissional › Desempenho:** "Recebido no mês" e "Comissão do mês" (só com `features.commissions`), pela data de recebimento e com a % congelada de cada pagamento.
- A regra de "a receber" é uma só (`listReceivables` em `payment.service.ts`), usada pelo Início e pelo Financeiro.

## Relatórios (Fase 5)

- **`/admin/relatorios`**:
  - o mesmo `PeriodPicker` do Financeiro (`src/components/admin/period-picker.tsx`; regra em `src/lib/period.ts`);
  - estado na URL (`?periodo&inicio&fim&aba`);
  - dados via `useFetchJson` (`src/lib/use-fetch-json.ts`, compartilhado com o Financeiro).
- **Cinco abas:**
  - Atendimentos;
  - Faturamento: recebido por dia em R$ e barras por forma (`MethodBreakdown`, compartilhado);
  - Profissionais: tabela comparativa, cartões no celular;
  - Serviços: receita ou quantidade;
  - Clientes: novos × que voltaram e quem mais gastou. Quem pagou por um atendimento de outra data aparece como "pagamento antecipado".
- **`KpiCard` com `delta`**: "▲ 12% vs. período anterior" (período imediatamente anterior, de mesmo tamanho).
  - Verde quando é bom, vermelho quando é ruim; `higherIsBetter: false` inverte (faltas, cancelamento, descontos).
  - Taxas comparam em **pontos percentuais** (`kind: "points"`).
  - Sem base (anterior = 0): "Sem base no período anterior".
- **Gráficos** (`relatorios/report-charts.tsx`) aceitam formatadores (`describe`, `formatTick`, `formatValue`) para valores em R$. A alternância gráfico/tabela continua em todos.
- **"Exportar CSV"**: recebimentos do período e fechamento de comissões, no formato do Excel pt-BR (BOM, `;`, vírgula decimal). Download por link com `download`.

## Configurações (Fase 6B)

- **`/admin/configuracoes`**: formulário longo, então é página. Cinco cartões (`SettingsCard`), cada um com o próprio "Salvar":
  - Negócio · Identidade · Horário · Reservas · Conta;
  - índice lateral fixo no desktop; no celular, faixa de atalhos rolável (links `#secao`).
- **`useSaveSettings`**: toast em sucesso, erro de validação inline ao lado do botão, e `router.refresh()` para o shell (nome, logo, cor, termos do nicho) mudar na hora.
- **Identidade**:
  - logo e capa por link `https://`, com prévia e aviso se a imagem não abrir;
  - cor com seletor + hex e prévia (botão e link) usando `getAccentCssVars` num contêiner — nunca muda o `:root` antes de salvar;
  - contraste mostrado com `accentContrast` (`src/lib/accent-color.ts`): texto do botão e cor como texto sobre fundo branco.
- **Reservas**: opções prontas em `Select` (sem número solto), exemplo concreto da antecedência e prévia "O cliente vê assim".
- **Página pública**: capa acima do cabeçalho (só no passo 1) e `BusinessDetails` (`<details>` nativo, fechado por padrão): "Aberto hoje · 09:00 às 19:00", semana agrupada ("Seg a Sex") e políticas em frases (`src/lib/business-info.ts`).
- **Link de gerenciar**: dentro do prazo de cancelamento, alerta `warning` com "Falar no WhatsApp" (mensagem pronta) no lugar de Cancelar/Reagendar.
- `WorkingHoursEditor` aceita `allowBreak={false}` (horário do negócio não tem almoço) e dá nome acessível aos campos de hora.

## Mensagens (Fase 6C)

- **`WhatsAppMessageMenu`** (`src/components/admin/whatsapp-message-menu.tsx`), no drawer do agendamento: "WhatsApp ▾" com os textos prontos que fazem sentido agora (futuro: Confirmação, Lembrete, Remarcação; concluído: Pós-atendimento; cancelado: Cancelamento), cada um com check e hora quando já enviado, e "Conversa sem mensagem pronta". Se os textos não carregarem, vira o botão simples de antes.
- Cada opção é um **link wa.me de verdade** (`DropdownMenuItem render={<a>}`): abrir o WhatsApp depois de um `fetch` seria bloqueado como pop-up. O clique só marca como enviado.
- **`/admin/mensagens`** (aba na URL, `?aba=`):
  - **Lembretes de amanhã** e **Pós-atendimento** (`MessageQueueList` + `MessageQueueRow`): contador "3 de 8 enviados" com barra `success`, "Ver mensagem" (`<details>`), enviar / reenviar / desmarcar;
  - **Modelos** (`TemplateEditor`): chips que inserem a variável no cursor, aviso para `{variável}` inexistente, prévia com dados do próprio negócio e "Restaurar padrão" com confirmação (modal).
- Estados: skeleton, vazio com explicação de quando a lista enche, erro com "Tentar de novo".
- No style guide, o editor roda em modo `demo` (não grava).

## Equipe: dono + profissionais

- **`AdminAccessProvider` / `useAdminAccess()`** (`src/components/admin/admin-access-context.tsx`): papel e permissões de quem está logado, com a mesma matriz do servidor (`permissions.ts`). Serve só para esconder o que o papel não pode; quem garante é a API.
- **Menu por papel** (`useAdminNav`): o profissional vê Início, Agenda, Clientes, Mensagens e Configurações; grupos vazios somem com o título.
- **Telas de dono** (Financeiro, Relatórios, Profissionais, Serviços, style guide): `requirePagePermission` no servidor manda o profissional ao Início.
- **Telas que o profissional abre, com conteúdo reduzido:**
  - **Configurações:** só a seção Conta.
  - **Mensagens:** só as listas, sem a aba Modelos.
  - **Agenda:** só a coluna dele. Com uma agenda só, o seletor de equipe some, e o "Novo agendamento" já vem com o profissional escolhido.
  - **Início:** os números dele e o cartão "Minha comissão no mês". Cartões e alertas que levariam ao Financeiro viram texto, sem link.
  - **Pagamento:** o `PaymentForm` esconde "Valor do atendimento" e "Desconto", e a lista esconde "Remover recebimento".
  - **Ficha do cliente:** sem "Total gasto"; histórico só com ele; "Notas e tags editadas por X em dd/mm/aaaa".
- **`StaffAccessCard`** (`src/components/admin/staff-access-card.tsx`), no cadastro do profissional › Dados:
  - estados: Sem acesso · Convite enviado · Acesso ativo · Acesso revogado (`StatusBadge`);
  - ao gerar, o link aparece uma única vez, com "Copiar" e "Enviar pelo WhatsApp" (`buildWhatsAppShareUrl`, sem destinatário fixo);
  - revogar e cancelar convite passam por modal de confirmação.
- **Página do convite** `/admin/convite/[token]`: cartão no padrão do login (marca do produto), nome já preenchido e e-mail e senha escolhidos pelo profissional. Link inválido ou usado mostra mensagem genérica.
  - No **primeiro acesso do dono** (cliente novo, `npm run novo-cliente`) o mesmo cartão diz "O painel de {negócio} está pronto. Crie o seu acesso de dono", com o nome em branco.
- **"Quem fez":**
  - linha em `text-caption` no drawer do agendamento ("Marcado por Carlos (dono) · Cancelado por João (barbeiro)");
  - "Registrado por" em cada recebimento;
  - sem autor registrado, a linha não aparece.
- **Barra superior:** o menu da conta mostra nome e papel ("Dono" ou o termo do nicho).

## Demonstração

Só em negócio de demonstração (`Business.isDemo`, ver `docs/como-clonar.md`):
- **`DemoBar`** (`src/components/demo-bar.tsx`), no topo da página pública: fundo `muted`, ícone `Sparkles` em `primary`, "Demonstração da Aprazzo" e o botão "Ver o painel da demonstração". É um `<form method="post">` comum (funciona sem JS); no celular o botão ocupa a largura toda.
- **`DemoBanner`** (`src/components/admin/demo-banner.tsx`), acima da barra superior do painel: "Você está numa demonstração", com link "Página de reservas" (nova aba, anunciado ao leitor de tela).
- Ações bloqueadas não somem da tela: o salvar mostra a mensagem da API ("Na demonstração, isso fica desativado…") no lugar de erro, para o visitante ver a tela inteira.

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
1. Nome, logo, capa, cor de marca, contato, horário e regras de reserva: tudo pela tela **Configurações** do painel (Fase 6B). Slug e fuso ficam de fora de propósito (ver CLAUDE.md).
2. Contraste do texto sobre a cor de marca é calculado automaticamente (`getAccentForeground`, `src/lib/accent-color.ts`, sempre o texto de maior contraste); a tela avisa quando a cor é clara demais para texto sobre fundo branco.
3. Terminologia e recursos do nicho: `Business.businessType` (definido na criação do cliente; em Configurações aparece só para leitura) escolhe o preset em `src/config/vertical.ts` (barbershop, beauty_clinic, tattoo_studio, generic). Troca "Profissional/Serviço/Cliente" em todas as telas, no e-mail e no menu, e liga/desliga portfólio, preço "a partir de" e categorias.

## Marca do produto (a plataforma) vs. marca do cliente

Duas camadas independentes:
- **Marca do produto: Aprazzo** (aplicada em 2026-10-01). Fonte da verdade: o design system em https://claude.ai/artifact/5EVQG5BRicTfK4M4X5AKNB.
  - `src/config/brand.ts`: nome "Aprazzo" (sempre com A maiúsculo), logos claro/escuro, capa do login, prévia de link e "Agendamento por Aprazzo" no rodapé da página pública.
  - **Cores** (`globals.css`), com os tokens do design system mapeados para os do shadcn:
    - `surface` → `background`, `surface-raised` → `card`/`popover`, `surface-muted` → `muted`/`secondary`/`accent`;
    - `ink` → `foreground`, `ink-muted` → `muted-foreground`;
    - `border-strong` → `input` (contorno de campos, 3:1);
    - `danger` → `destructive`; `chart-1..4`.
    - `--brand-cover` é o verde fixo das capas (igual nos dois temas).
  - **Fontes** (`app/layout.tsx`, via `next/font`, servidas pelo próprio site): Instrument Sans na interface (`--font-sans`) e Bricolage Grotesque nos títulos de marca (`--font-heading`, aplicada no `h1` de 24px).
  - `BrandLogo` (`src/components/brand-logo.tsx`) troca o logo claro/escuro só por CSS. O favicon é `src/app/icon.svg`. Login com a capa 1920×1080 inteira ao lado no desktop.
  - `DEFAULT_ACCENT_COLOR` = `#0F766E` (primary da marca) para negócio sem cor escolhida.
- **Marca do cliente** — `Business.accentColor`/`logoUrl`, aplicada via `AccentColorScope` sobre `--primary` no painel e na página pública. Só a família `primary` muda por cliente: `--primary-hover` e `--primary-soft` são calculados de `--primary` com `color-mix` em `globals.css`, então seguem a cor do cliente. Neutros, status, gráficos e fontes continuam os da Aprazzo.
- **Status:**
  - agendamento: pendente `warning`, confirmado `info`, concluído `success`, falta `destructive`, cancelado neutro (`muted-foreground`);
  - pagamento: pendente neutro, parcial `warning`, pago `success`.

## Horários na página pública

- A grade (`TimeSlotGrid`) mostra também os **horários ocupados**, riscados e desabilitados (anunciados como "ocupado" no leitor de tela), em vez de escondê-los. O **primeiro horário livre** ganha o selo "Mais próximo".
- Os ocupados vêm de `/api/availability?ocupados=1` (`occupied-slots.ts`): a grade do expediente sem ocupação, menos os livres. É só exibição: os horários livres e a revalidação da reserva continuam vindo de `getAvailableSlots`, sem mudança.
- Se o dia está todo ocupado, aparece o estado vazio "Todos os horários deste dia estão ocupados".

## Reserva, presença e acesso (Bloco C)

- **Confirmação da reserva** (`[slug]/confirmation-step.tsx`): título "Horário confirmado!". O texto muda se o cliente informou e-mail ("Enviamos os detalhes para…") ou não ("Guarde o link abaixo…"); o link serve para cancelar ou remarcar e fica num quadro `primary/10` com "Salvar no meu WhatsApp" (`buildWhatsAppShareUrl`) e "Copiar link" (toast).
- **Link de gerenciar**: com a cara do negócio (`AccentColorScope`, logo, nome, endereço com mapa, botão de WhatsApp; a aba do navegador diz "Seu agendamento · {negócio}"), "Adicionar ao calendário" e frase no topo "Seu horário está confirmado. Use esta página se precisar cancelar ou remarcar." Dois blocos: **vermelho** (`destructive/10`) "Não vai poder ir?" com "Cancelar agendamento" e **amarelo** (`warning/10`) "Precisa de outro horário?" com "Remarcar" (o reagendamento abre dentro do bloco). Dentro do prazo de cancelamento, continua o aviso com "Falar no WhatsApp".
  - **Remarcar**: o toque no horário só escolhe; um quadro pergunta "Remarcar para {dia}, às {hora}?" com "Confirmar remarcação" / "Escolher outro horário". Depois, aviso `success` "Horário alterado para…".
  - **Cancelar** (inclusive "Não vou neste dia" e "Cancelar todas as próximas" do horário fixo): modal do sistema (`Dialog`), nunca o `confirm()` do navegador. Cancelado, quadro "Agendamento cancelado" com "Reservar outro horário".
  - Ao trocar de dia (reserva e remarcação), a grade do dia anterior some na hora: o resultado guarda a qual dia pertence.
- **Fluxo de reserva**: serviço que nenhum profissional ativo realiza fica fora da página (em Serviços: "Ninguém realiza · fora da página até alguém fazer"). "Sem preferência" tem ícone e explicação, e some quando só uma pessoa faz o serviço; com o horário escolhido, o resumo já mostra quem atende. Preço "a partir de" aparece por extenso ("a partir de R$ 80,00", também no painel) e o resumo explica que o valor final é combinado no atendimento.
- **Link depois do atendimento**: sem avaliação; quadro "Obrigado pela visita!" com o botão "Reservar de novo" (página do negócio).
- **Cartão do profissional** (`ProfessionalCard`): "Especialidade: …" com ícone `Award`. A bio não entra no lugar da especialidade.
- **Início**: o `Alert` ganhou o tom `info` (azul, ícone `CalendarPlus`) para "reservas novas pela página", com as três últimas em `text-caption`.
- **Esqueci minha senha** e **Criar senha nova**: cartões no padrão do login (marca do produto); a resposta do pedido é sempre a mesma.
- **`LegalPage`** (`src/components/legal-page.tsx`): moldura de `/termos` e `/privacidade` (logo, título, data, artigo com `h2` de seção e rodapé com o contato).

## Dias fechados (Bloco D)

- **Configurações › Dias fechados** (`closures-section.tsx`): lista com "Reabrir" (modal de confirmação), formulário Data · Até (opcional) · Motivo, e o diálogo **"Adicionar feriados nacionais"** (próximos 12 meses; facultativos desmarcados; os já fechados aparecem desabilitados). Ao fechar, alerta `warning` com os agendamentos já marcados no período, com link para a agenda do dia.
- **Página pública**: na `DateStrip`, o dia fechado fica `bg-muted` riscado, com o motivo no `title` e no nome acessível; selecionado, mostra "Fechado neste dia: {motivo}" no lugar da grade (o botão "Próximo horário disponível" continua).
- **Agenda**: coluna hachurada (mesmo padrão dos bloqueios) com o selo "Fechado: {motivo}"; o clique continua abrindo o encaixe, que avisa no `BookingTimeNotice` (`closedReason`). Arrastar para o dia abre o modal "Negócio fechado". No celular, aviso no topo da lista.
- `useBusinessClosures()` (`components/admin/use-business-closures.ts`) carrega os dias fechados para a agenda e o encaixe.

## Horários e folgas (Bloco E3)

- **Expediente** (cadastro do profissional): cada dia mostra à direita "Negócio: 09:00 às 17:00" (ou "Negócio fechado"); fora disso o dia fica `warning/10` com "· fora do horário" e o salvar recusa. O dia desligado diz "Folga". Profissional novo já vem com o horário do negócio.
- **"Folgas e ausências de {nome}"** (`TimeBlocksManager`): cartão à parte, abaixo do formulário, com o próprio botão "Adicionar ausência" (grava na hora). Chips `role="radio"` "Dia inteiro (ou vários dias)" / "Só algumas horas"; lista só do que ainda não passou, em texto ("13/11 a 17/11 · dias inteiros · Férias"). Link "Use Dias fechados" para feriado de todos; Dias fechados devolve "Folga ou férias de uma pessoa só ficam no cadastro dela".
- **Lembretes** (Mensagens): setas "Dia anterior"/"Próximo dia" com "Amanhã, segunda-feira, 05 de outubro"; estado vazio "Nenhum agendamento neste dia".

## Painel instalável (Bloco D)

- **`/admin/instalar`** (`install-guide.tsx`): três cartões numerados (Android, iPhone, Computador); o do aparelho de quem vê vem primeiro, com `ring-primary` e "seu aparelho". Quando o navegador permite, quadro `primary/10` com "Instalar agora". Já aberto como app: aviso `success`.
- Atalhos: "Instalar no celular" no menu da conta (computador) e na gaveta "Mais" (celular). A mensagem de entrega ao dono também cita.
- Ícones: o da marca (cantos arredondados) para "any"; quadrado cheio com o símbolo em 60% para "maskable" e 70% para o iPhone (o sistema recorta/arredonda).

## Importar clientes (Bloco D)

- **`/admin/clientes/importar`** (botão "Importar planilha" na tela de Clientes, só do dono), em 3 cartões numerados: 1) como a planilha deve estar (tabela de colunas com `*` obrigatória, "Baixar modelo" e o passo a passo do Excel e do Google Planilhas); 2) área de arquivo tracejada (`label` com `input` escondido, foco visível); 3) prévia com as 5 primeiras linhas, aviso `warning` com as linhas de fora (número da linha + motivo), escolha pular/atualizar para os já cadastrados e o botão "Importar N linhas". Concluído: aviso `success` com o resumo.

## Horário fixo (Bloco D)

- **`SeriesDialog`** (`components/admin/series-dialog.tsx`): frequência e quantidade em `Select`; prévia ao vivo com cada data ("Livre" em `success` ou o motivo em `warning`) e "Criar N horários" (só as livres). Usado no drawer ("Repetir este horário"), no "Novo agendamento" (caixa "Repetir este horário", abre depois de salvar) e no "Renovar".
- **Drawer**: seção "Horário fixo · toda semana" com as próximas datas e "até dd/mm/aaaa", "Enviar as datas pelo WhatsApp" (texto pronto com o link de cancelar uma data), "Renovar" (só na última data) e "Cancelar datas" (modal com "Só esta data" / "Esta e as próximas").
- **Agenda**: `SeriesIndicator` (ícone `Repeat`, `aria-label` "Horário fixo") ao lado do indicador de pagamento.
- **Link do cliente**: quadro "Horário fixo" com a frase em linguagem simples, a lista das próximas datas com "Não vou neste dia" (ou "Perto demais: fale com o negócio" dentro do prazo) e "Cancelar todas as próximas".
