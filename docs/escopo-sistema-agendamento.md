# Escopo do Projeto — Sistema de Agendamento/Reservas (Barbearias e Consultórios)

> Documento de referência para iniciar o desenvolvimento com Claude Code (modo plano). Contém visão de produto, escopo funcional, modelagem de dados, decisões técnicas já resolvidas, stack e diretrizes de UI/UX.

---

## 1. Visão do produto

Um SaaS multi-tenant de agendamento online para pequenos negócios baseados em horário marcado — barbearias, salões, clínicas, consultórios, estúdios de estética, personal trainers, etc.

Cada negócio (tenant) tem sua própria conta, cadastra profissionais, serviços e horários de funcionamento. Clientes finais agendam por um link público, sem precisar criar conta.

**Objetivo do projeto:** ser um case de portfólio que pareça um produto real e vendável — não um CRUD de estudo. Prioridade em: UI moderna e polida, fluxo de agendamento com fricção mínima, decisões de arquitetura defensáveis em entrevista técnica.

**Referências de mercado (inspiração de UX, não para copiar visualmente):**
- **Fresha** — referência principal para o fluxo de agendamento em si: seleção de serviço → profissional → data/hora em poucos passos, com resumo sempre visível lateralmente (desktop) ou fixo no rodapé (mobile).
- **Calendly** — referência para simplicidade do calendário de disponibilidade e para o fluxo "sem conta" de quem agenda.
- **Booksy / Treatwell** — referência para o painel do lado do negócio (agenda visual por profissional, cores por status de agendamento, bloqueios de horário).
- **Cal.com** (open source) — bom para inspirar a página pública "clean" do negócio e o design system (tipografia grande, bastante espaço em branco, poucos elementos por tela).

Princípios de design a seguir (ver seção 6 para detalhes):
- Poucos cliques até confirmar (idealmente 4 telas: serviço → profissional → horário → dados de contato).
- Estado sempre visível (o que já foi escolhido não desaparece da tela).
- Feedback imediato (loading states, confirmação visual, nunca "tela branca" durante requisições).
- Mobile-first: a maioria dos clientes finais vai agendar pelo celular.

---

## 2. Personas

1. **Dono do negócio (admin)** — cadastra o negócio, profissionais, serviços; acompanha agenda e relatórios.
2. **Profissional** — opcionalmente tem login próprio para ver só a própria agenda (pode ficar de fora do MVP e entrar como v2).
3. **Cliente final** — agenda sem criar conta, recebe confirmação, pode cancelar/reagendar pelo link recebido.

---

## 3. Escopo funcional (MVP)

### 3.1 Painel do negócio (admin)
- Cadastro do negócio: nome, slug (usado na URL pública), endereço, timezone, horário de funcionamento, logo, cor de destaque (para dar identidade visual na página pública).
- Cadastro de profissionais: nome, foto, especialidades, horários de trabalho (por dia da semana), vínculo com serviços que ele realiza.
- Cadastro de serviços: nome, descrição curta, duração, preço, vínculo com profissionais.
- Bloqueio manual de horários (folga, almoço, feriado, intervalo entre atendimentos).
- Agenda visual (dia/semana) por profissional, com cores por status (confirmado, cancelado, concluído, no-show).
- Ações rápidas na agenda: confirmar, cancelar, marcar como concluído, marcar no-show.
- Relatório simples: agendamentos por período, taxa de cancelamento/no-show, profissional mais requisitado (gráfico).

### 3.2 Página pública de agendamento (cliente)
- URL própria por negócio: `seusaas.com/{slug}`.
- Fluxo: escolher serviço → escolher profissional (ou "sem preferência") → escolher data/horário disponível → informar nome/telefone/e-mail → confirmar.
- Cálculo de horários livres considerando: duração do serviço, agenda já ocupada do profissional, horário de trabalho, bloqueios manuais.
- Confirmação por e-mail (e opcionalmente WhatsApp/SMS futuramente) com link de gerenciamento.
- Cancelamento/reagendamento via link único, sem exigir login (ver seção 4).
- Avaliação pós-atendimento (nota + comentário) via link enviado depois do horário do serviço.

### 3.3 Autenticação
- Login com e-mail/senha para admin do negócio (JWT + refresh token, ou sessão).
- Cliente final **não tem conta** — decisão de produto para reduzir fricção (justificar isso no README do projeto).

### 3.4 Fora do MVP (v2 — mencionar como "próximos passos" no README)
- Multi-idioma (PT/EN).
- Pagamento antecipado/sinal (Stripe).
- Notificação por WhatsApp.
- Login próprio para profissionais.
- Regra de bloqueio automático de cliente com muitos no-shows.

---

## 4. Decisão já resolvida: cancelamento sem conta

**Problema:** como o cliente cancela/reagenda um agendamento sem estar logado?

**Solução:** token único e não-adivinhável por agendamento (`manage_token`, ex. UUID v4), gerado no momento da criação e enviado no link de confirmação:

```
https://seusaas.com/agendamento/{manage_token}/gerenciar
```

Regras de segurança:
- Nunca usar ID sequencial na URL pública (evita enumeração).
- Buscar sempre pelo token, nunca por nome/telefone/e-mail combinados.
- Token inválido ou expirado → erro genérico (não revelar se o agendamento existe).
- Rate limiting na rota de acesso por token.
- Expiração opcional do token (ex. X dias após o horário do atendimento).
- Fluxo de "recuperar meu agendamento" (opcional, v2): buscar por telefone/e-mail + reenviar o link para o mesmo contato cadastrado, sem nunca expor o token diretamente na tela.

Modelo de dados já contempla esse campo (ver seção 5).

---

## 5. Modelagem de dados (rascunho inicial)

```
Business
 - id, name, slug, timezone, address
 - logo_url, accent_color
 - created_at

Professional
 - id, business_id, name, photo_url
 - created_at

WorkingHours
 - id, professional_id, weekday, start_time, end_time

Service
 - id, business_id, name, description, duration_min, price

ProfessionalService (N:N)
 - professional_id, service_id

TimeBlock
 - id, professional_id, start, end, reason

Client
 - id, name, phone, email

Appointment
 - id, business_id, professional_id, service_id, client_id
 - start_time, end_time, status (pending, confirmed, cancelled, completed, no_show)
 - manage_token, manage_token_expires_at
 - created_at

Review
 - id, appointment_id, rating, comment
```

Pontos técnicos a documentar bem no README (mostram maturidade em entrevista):
- Cálculo de slots disponíveis: evitar overlap, considerar timezone, duração variável por serviço.
- Isolamento de dados por `business_id` (multi-tenancy).
- Testes automatizados especificamente na lógica de disponibilidade (é a parte mais propensa a bugs).

---

## 6. Diretrizes de UI/UX (para o Claude Code seguir desde o início)

### Fluxo do cliente (página pública)
- Máximo 4 passos até a confirmação: serviço → profissional → horário → dados de contato.
- Barra de progresso ou indicador de etapas visível no topo.
- Resumo da escolha sempre visível (sidebar fixa no desktop, barra fixa no rodapé no mobile) — igual ao padrão Fresha.
- Botão de "voltar" sempre disponível sem perder o que já foi preenchido.
- Grade de horários disponíveis clara, com espaçamento generoso, sem inputs de texto para digitar hora.
- Tela de confirmação com resumo completo (serviço, profissional, data, hora, endereço) e opção de adicionar ao Google Calendar/Apple Calendar (`.ics`).

### Painel do negócio (admin)
- Agenda em formato calendário (dia/semana), com cores por status — inspirado em Booksy/Treatwell.
- Sidebar de navegação fixa (Agenda, Profissionais, Serviços, Clientes, Relatórios, Configurações).
- Modal (não nova página) para criar/editar agendamento manualmente, profissional ou serviço — reduz troca de contexto.
- Dashboard inicial com números-chave do dia (agendamentos de hoje, próximos, cancelamentos recentes).

### Sistema visual
- Design limpo, bastante espaço em branco, tipografia grande e legível (nada de UI "densa" tipo planilha).
- Paleta neutra como base + uma cor de destaque configurável por negócio (personalização = ótimo argumento de venda).
- Componentes consistentes: usar um design system (ex. shadcn/ui + Tailwind) em vez de estilizar tudo do zero — mostra pragmatismo, não só capricho visual.
- Dark mode é um diferencial bom de ter, mas não é bloqueante para o MVP.
- Estados vazios (empty states) bem tratados: "Você ainda não tem agendamentos hoje" em vez de tela em branco.
- Skeleton loaders em vez de spinners genéricos ao carregar agenda/listas.
- Responsividade real testada em mobile (a maioria dos clientes finais vai acessar pelo celular).

---

## 7. Stack sugerida

- **Frontend:** Next.js (React) + TypeScript + Tailwind CSS + shadcn/ui — combinação muito usada no mercado atualmente e fácil de fazer ficar bonito rápido. (Alternativa: Angular, já que você domina, mas Next.js tem mais apelo pro tipo de vaga que combina com um portfólio moderno.)
- **Backend:** Node.js + NestJS (estrutura modular, bom para mostrar organização em entrevista) — ou API Routes do próprio Next.js se quiser simplificar o deploy.
- **Banco de dados:** PostgreSQL.
- **ORM:** Prisma.
- **Autenticação:** JWT + bcrypt (ou uma lib como Auth.js se usar Next.js).
- **Deploy:** Vercel (frontend/API) + Railway ou Render (Postgres).
- **Documentação de API:** Swagger/OpenAPI.
- **Testes:** Vitest/Jest para lógica de disponibilidade de horários (prioridade), Playwright para um teste E2E do fluxo de agendamento completo.

---

## 8. Checklist de entrega para o portfólio

- [ ] Deploy ao vivo funcionando (link clicável no README).
- [ ] README em inglês (ou PT+EN) explicando problema, decisões técnicas e trade-offs — incluir a explicação do token de gerenciamento sem conta.
- [ ] Testes automatizados na lógica de disponibilidade.
- [ ] Vídeo curto ou GIF mostrando o fluxo completo (agendamento + painel admin).
- [ ] Dados de exemplo (seed) para quem for testar o projeto não ver tudo vazio.

---

## 9. Como usar este documento com o Claude Code

Sugestão de prompt inicial no modo plano:

> "Vou te passar o escopo completo de um sistema de agendamento (documento em anexo). Quero que você monte um plano de implementação em fases (schema do banco → API → painel admin → página pública → testes), começando pela modelagem de dados no Prisma. Pergunte o que precisar antes de gerar código."

Recomenda-se desenvolver em fases nessa ordem: schema + migrations → API de disponibilidade de horários (com testes) → autenticação do admin → painel admin → página pública do cliente → fluxo de cancelamento por token → polimento de UI → deploy.
