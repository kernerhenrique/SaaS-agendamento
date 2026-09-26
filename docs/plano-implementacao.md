# Plano de Implementação — Projeto Base Comercial (Fases 1-7)

> Entregável da Fase 0. Detalha as fases seguintes do roadmap combinado com o usuário. **Nenhuma mudança de código, schema ou migration é aplicada por este documento** — cada fase começa com plano específico e espera aprovação antes de escrever código, conforme regra do `CLAUDE.md`. Baseado no diagnóstico em `docs/diagnostico.md`.

## 0. Resumo executivo

O código de hoje é o MVP de portfólio original; o objetivo é fechar a distância até um produto no nível Fresha/Booksy/Trinks/Cal.com, mantendo a base técnica (disponibilidade, auth, multi-tenant, exclusion constraint) intocada. Ordem: design system → página pública mais rica → admin completo → pagamentos/financeiro → relatórios → mensagens/configurações → base clonável. Pagamentos e comissão (Fase 4) são o maior gap de produto; design system (Fase 1) é pré-requisito de qualidade visual para todas as telas novas das fases seguintes.

---

## 1. Proposta de schema Prisma

Cobre as necessidades das Fases 2 a 6. **Proposta para aprovação — só vira migration quando a fase correspondente for iniciada.** Decisões de comissão já confirmadas com o usuário: **percentual inteiro (0–100)**, sem casas decimais, e **snapshot por agendamento** (a taxa vigente é gravada na conclusão/pagamento; relatórios de meses fechados nunca mudam retroativamente mesmo que a comissão do profissional seja alterada depois).

### 1.1 Snapshot de preço no agendamento (pré-requisito do Financeiro)

```prisma
model Appointment {
  // ...campos existentes...
  priceCentsSnapshot        Int
  commissionPercentSnapshot Int?
}
```

`priceCentsSnapshot`: preço do serviço no momento da criação do agendamento — sem isso, editar o preço de um serviço reescreveria retroativamente relatórios financeiros de agendamentos antigos. `commissionPercentSnapshot`: gravado quando o agendamento é concluído (ou quando o primeiro pagamento é registrado — a definir na Fase 4).

**Risco de dado**: coluna precisa de **backfill** para as linhas existentes. Gerar a migration com `prisma migrate dev --create-only` e editar o SQL manualmente: `ADD COLUMN priceCentsSnapshot` nullable → `UPDATE "Appointment" a SET "priceCentsSnapshot" = s."priceCents" FROM "Service" s WHERE s.id = a."serviceId"` → `ALTER COLUMN ... SET NOT NULL`. É o único ponto desta proposta com risco real sobre dado existente; todo o restante é aditivo com `nullable`/`default`.

### 1.2 Model `Payment` (Fase 4)

```prisma
enum PaymentMethod {
  CASH
  PIX
  DEBIT_CARD
  CREDIT_CARD
  BANK_TRANSFER
  OTHER
}

model Payment {
  id            String        @id @default(cuid())
  businessId    String
  business      Business      @relation(fields: [businessId], references: [id], onDelete: Cascade)
  appointmentId String
  appointment   Appointment   @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  amountCents   Int
  discountCents Int           @default(0)
  method        PaymentMethod
  receivedAt    DateTime      @db.Timestamptz(6)
  note          String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  deletedAt     DateTime?

  @@index([businessId, receivedAt])
  @@index([appointmentId])
}
```

Relação **1:N com `Appointment`** (não 1:1) — um agendamento pode ter várias linhas de pagamento (sinal + saldo, ou formas de pagamento diferentes). O SaaS nunca processa o pagamento em si, só registra o que já aconteceu fora dele (PIX, dinheiro, maquininha), conforme regra do produto.

**Status pendente/parcial/pago é calculado, não persistido**, evitando duplicar dado e drift:

```
totalRecebido = soma(payment.amountCents − payment.discountCents), pagamentos não deletados
totalRecebido ≤ 0                              → PENDENTE
0 < totalRecebido < priceCentsSnapshot         → PARCIAL
totalRecebido ≥ priceCentsSnapshot             → PAGO
```

Se no futuro a listagem de pendências precisar ser rápida em alto volume, uma coluna `paymentStatus` denormalizada mantida transacionalmente é uma otimização possível — não faz parte do desenho inicial.

### 1.3 Comissão do profissional (Fase 4)

```prisma
model Professional {
  // ...
  commissionPercent Int?  // 0-100; null = usa o padrão do negócio
}

model Business {
  // ...
  defaultCommissionPercent Int?  // padrão quando o profissional não tem override
}
```

Mantém o padrão do projeto de nunca usar `Decimal` para dinheiro/percentual (tudo inteiro) — decisão confirmada com o usuário.

### 1.4 Portfólio de fotos do profissional (Fase 2/3)

```prisma
model ProfessionalPhoto {
  id             String       @id @default(cuid())
  professionalId String
  professional   Professional @relation(fields: [professionalId], references: [id], onDelete: Cascade)
  url            String
  position       Int          @default(0)
  createdAt      DateTime     @default(now())

  @@index([professionalId, position])
}
```

`Professional.photoUrl` continua sendo a foto principal/avatar; a galeria é aditiva, nasce vazia, sem risco de migração de dado.

### 1.5 Categoria de serviço e preço "a partir de" (Fase 2/3)

```prisma
model ServiceCategory {
  id         String    @id @default(cuid())
  businessId String
  business   Business  @relation(fields: [businessId], references: [id], onDelete: Cascade)
  name       String
  position   Int       @default(0)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  deletedAt  DateTime?

  services   Service[]

  @@unique([businessId, name])
  @@index([businessId])
}

enum ServicePriceType {
  FIXED
  FROM
}

model Service {
  // ...
  categoryId String?
  category   ServiceCategory? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  priceType  ServicePriceType @default(FIXED)
}
```

`categoryId` nullable + `onDelete: SetNull`: serviços existentes continuam funcionando sem categoria; apagar uma categoria nunca apaga serviços. `priceCents` é reaproveitado com semântica dupla (fixo, ou "a partir de" quando `priceType = FROM`) — só muda o rótulo exibido na UI.

### 1.6 Políticas de reserva e horário geral do negócio (Fase 3/6)

```prisma
model Business {
  // ...
  minBookingNoticeMinutes   Int     @default(0)
  maxBookingWindowDays      Int     @default(60)
  cancellationDeadlineHours Int     @default(0)
  policyText                String?
  businessType              String  @default("barbershop")
}

model BusinessWorkingHours {
  id          String   @id @default(cuid())
  businessId  String
  business    Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  weekday     Weekday
  startMinute Int
  endMinute   Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([businessId, weekday])
  @@index([businessId])
}
```

`businessType` é **string livre, não enum Prisma** — o preset de vertical (terminologia, feature flags) vive em código (`src/config/vertical.ts`), não no banco; um enum exigiria migration a cada cliente novo, contrariando o objetivo de base clonável. Mitigação: validar `businessType` contra as chaves do registry de `vertical.ts` na camada de API (zod) sempre que for escrito.

`BusinessWorkingHours` é **tratado como informativo** na Fase 3 (exibido na página pública como "horário de funcionamento"), **não acoplado à engine de disponibilidade** (`src/server/modules/appointment`, coberta por `availability.spec.ts`) nesta fase — acoplar isso muda comportamento já testado e fica para uma decisão futura própria, com plano e testes dedicados.

**Regra de negócio ainda não descrita** (`docs/pesquisa-referencias.md` também sinaliza isso): os valores de `minBookingNoticeMinutes`, `maxBookingWindowDays` e `cancellationDeadlineHours` acima são só *nomes de campo e formato* propostos (inspirados em Cal.com/Calendly, que usam campos separados com unidade configurável — minutos/horas/dias, dias corridos vs. úteis). Os *valores* e se cada regra é obrigatória ou opcional por negócio **não estão decididos** e precisam ser perguntados explicitamente ao usuário quando a Fase 3/6 começar, antes de qualquer migration — conforme a regra do CLAUDE.md de nunca assumir regra de negócio não descrita.

### 1.7 Tags e notas do cliente (Fase 3)

```prisma
model Client {
  // ...
  internalNotes String?
  tags          String[]  @default([])
}
```

`String[]` nativo do Postgres — simples o bastante para labels livres ("VIP", "alérgico a produto X"). Um model `ClientTag` dedicado só se justificaria com autocomplete/cor por tag entre clientes, o que não é requisito hoje.

### 1.8 Migrations sugeridas (uma por área, aplicadas só na fase correspondente)

1. `add_appointment_price_snapshot` — isolada por causa do backfill manual.
2. `add_payment_module` — enum `PaymentMethod` + model `Payment`.
3. `add_professional_commission_and_portfolio`.
4. `add_service_category_and_price_type`.
5. `add_business_policies_working_hours_vertical`.
6. `add_client_tags_notes`.

Todas de 2 a 6 são aditivas com `nullable`/`default`, sem backfill. `prisma/seed.ts` precisa ser atualizado em cada fase correspondente para popular os novos campos (senão as telas novas nascem vazias em dev).

---

## 2. Fase 1 — Design system

- Tokens de tipografia (escala de tamanho/peso) e de sombra (`--shadow-*`) no `@theme`, corrigindo a sombra inline arbitrária identificada no diagnóstico (rodapé fixo mobile do fluxo de reserva).
- Instalar `sonner` e `motion` (citados no CLAUDE.md, ausentes do `package.json`).
- Adicionar componentes shadcn: Sheet/Drawer, Table, Tabs, Tooltip, Popover, DropdownMenu.
- Corrigir a inconsistência já identificada: `manage-view.tsx` usando `<button>` puro em vez do componente `Button`.
- Rota `/admin/design-system` (style guide vivo) + `docs/design-system.md`.
- **Parar e mostrar o style guide antes de aplicar nas telas** (regra já combinada).

## 3. Fase 2 — Página pública mais rica

**Status: implementada (2026-09-26).** Aplicada como uma única migration (`fase2_service_category_portfolio_business_contact`) em vez de duas — ambas eram aditivas e sem risco de dado, então não havia motivo real para separar. Todo o restante saiu como planejado, incluindo a troca do seletor de data.

- Categoria de serviço, preço "a partir de", portfólio do profissional, políticas de reserva exibidas (usa o schema da seção 1.4–1.6, migrations 3–5 aplicadas nesta fase ou na 3, a definir no plano específico da fase).
- Adicionar o link de gerenciamento na tela de confirmação (gap identificado no diagnóstico — hoje só vai por e-mail).
- **Trocar o seletor de data**: decisão confirmada com o usuário (2026-09-25) de substituir o calendário mensal (`MonthCalendar`) por um seletor de data em faixa horizontal (estilo Fresha) em `src/app/[slug]/datetime-step.tsx` — novo componente a construir nesta fase, ver `docs/design-system.md`.

## 4. Fase 3 — Admin completo

**Replanejada em 2026-09-26** em 4 blocos com parada entre eles: 3A fundação (preset de vertical, marca do produto, campos de schema, telefone padronizado), 3B menu + Início, 3C agenda (visões dia/semana, arrastar, drawer), 3D clientes/profissionais/serviços. Configurações ficou na Fase 6; preço/duração por profissional, depois da Fase 4. **3A: implementado. 3B: implementado** (shell novo, Início com KPIs do mês e alertas, busca Ctrl+K, telas "em breve"). **3C: implementado** (visões dia/semana, linha do "agora", clique no vazio para agendar, arrastar para remarcar com revalidação no servidor, drawer de detalhes com remarcação, lista por profissional no celular; E2E `tests/e2e/admin-agenda.spec.ts`). **Ajustes pós-3C (pedido do usuário):**
- encaixe e remarcação pelo painel recusam passado (tolerância de 15 min), bloqueio e serviço que o profissional não faz;
- fora do expediente só com confirmação ("Agendar mesmo assim");
- cancelar pede confirmação;
- cancelado continua visível na agenda (apagar foi descartado).

- Navegação de 9 itens; telas novas de **Clientes** (mini-CRM) e **Configurações** (identidade, contato, políticas, horário geral, vertical).
- `BusinessWorkingHours` como informativo (ver 1.6).

## 5. Fase 4 — Pagamentos e Financeiro

- Módulo `src/server/modules/payment/` (padrão dos módulos existentes).
- Migrations 1 e 2 da seção 1.8. Tela Financeiro, registro de pagamento ao concluir atendimento, cálculo de comissão por profissional no período.

## 6. Fase 5 — Relatórios

- Estender `getReportSummary` com financeiro/comissão. Cobrir com teste isolado a lacuna já identificada no diagnóstico (`getReportSummary` como um todo, e `getAvailableSlots` de orquestração).

## 7. Fase 6 — Mensagens e Configurações

- `src/server/modules/notification/whatsapp/` (isolado, como o CLAUDE.md já prevê, para plugar API oficial depois sem mexer nas telas).
- Preset de vertical em `src/config/vertical.ts` (terminologia + feature flags), consumido pela tela de Configurações.

## 8. Fase 7 — Base clonável

- Presets de vertical completos + seeds por vertical + script `npm run novo-cliente` + `docs/como-clonar.md`.
- **Decisão em aberto, não resolvida neste plano**: multi-tenant no base (cada clone usa um tenant) vs. simplificar para single-tenant por clone. Fica para quando esta fase começar, com plano próprio e aprovação explícita do usuário — não decidir por conta própria antes disso.

## 9. Dependências entre fases

Fase 1 (design system) é pré-requisito de qualidade visual para 2 e 3. Fase 4 (Payment + snapshot de preço) depende do schema da seção 1.1–1.3 e deveria vir depois de 2/3 para não competir por atenção com a reformulação de UI. Fase 5 depende de 4 (dados financeiros para reportar). Fase 6 e 7 são as mais independentes entre si, mas 7 (clonagem) só faz sentido depois que o preset de vertical (Fase 6) existir.

## 10. Critério de "pronto" por fase

`npm run lint`, `npm run test` e `npm run test:e2e` passando; screenshots desktop (1440px) e mobile (390px) das telas alteradas em `docs/screenshots/depois/`; estados de carregando/vazio/erro implementados; navegação por teclado, foco visível, labels, contraste AA; nenhum valor visual fora dos tokens; `CLAUDE.md` e docs atualizados se a fase mudar estrutura, regra de negócio ou fluxo de clonagem.
