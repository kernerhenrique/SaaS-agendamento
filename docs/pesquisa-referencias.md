# Pesquisa de Referências de Mercado

> Documento de pesquisa (não de decisão). Reúne padrões de **layout, fluxo e funcionalidade** observados em produtos de mercado, para embasar o plano de evolução do projeto de MVP de portfólio para base comercial clonável. Identidade visual, cores e logos das referências **não** são objeto desta pesquisa — o design system do projeto é tratado em `docs/design-system.md`. As decisões de adotar (ou não) cada padrão ficam para o documento de plano de implementação, não para este documento.

---

## Fresha

**Contexto de uso**: plataforma internacional de agendamento para salões, barbearias e clínicas de estética. É a referência principal já citada em `docs/escopo-sistema-agendamento.md` para o fluxo de reserva do cliente final.

**O que observamos**:
- O fluxo público de reserva segue a ordem: seleção do serviço → (opcional) seleção do profissional, quando a disponibilidade online permite → seleção de data/horário em tempo real, considerando agenda e turnos cadastrados → tela final de revisão, que mostra serviços escolhidos, profissional(is), data, hora, preço total, informações do negócio e campo opcional de observação para a equipe (fonte: [Learn how clients book appointments online](https://www.fresha.com/help-center/knowledge-base/online-profile/599-learn-how-clients-book-appointments-online)). Isso confirma o padrão de "poucos passos com resumo no final" que já está no nosso escopo.
- **Não encontramos confirmação explícita e específica** (nem em texto nem em screenshot) de que existe uma barra de resumo fixa no rodapé durante o preenchimento no mobile web, nem de uma sidebar de resumo fixa durante todas as etapas no desktop — a documentação de ajuda da Fresha descreve o *conteúdo* de cada etapa, mas não a *disposição visual* (sidebar vs. tela cheia). Marcamos isso como não confirmado; não deve ser tratado como fato.
- Fresha oferece um app dedicado tanto para o negócio quanto para o cliente, além da versão web, com paridade de funcionalidades entre desktop e mobile (fonte: mesma página acima).
- Sobre a navegação do painel do negócio: encontramos evidência de que "Fresha Payments" é tratado como uma área própria e integrada ("integrated with your calendar, client profiles, and reporting — part of one seamless system", fonte: [Fresha Payments](https://www.fresha.com/payments)), o que sugere um módulo de pagamentos distinto de "Reports"/relatórios. Porém, buscas adicionais (incluindo um review de terceiro, [Fit Small Business](https://fitsmallbusiness.com/fresha-review/)) não confirmaram com certeza a lista exata e a ordem dos itens da sidebar (uma fonte cita "Services" como estando dentro de "Settings", não como item de topo). **Não temos confiança suficiente para afirmar a estrutura exata do menu lateral do Fresha** — é uma lacuna de pesquisa, não um achado.
- Tela de perfil/detalhe do cliente: o Fresha mostra uma visão geral (contato, gasto total, avaliações) e abas dedicadas — Appointments, Sales, Items — para histórico completo. O sistema também guarda notas, tags para segmentação de clientes, preferências de serviço, alergias, resultados de teste de mecha (patch test), formulários e histórico de fidelidade, além de documentos/imagens anexados ao perfil (fonte: [View a client's appointment history](https://www.fresha.com/help-center/knowledge-base/clients/204-view-client-history) e material institucional do próprio Fresha).

**Como se aplica ao nosso caso**: nosso `Client` hoje é bem simples (nome, telefone, e-mail — ver `docs/escopo-sistema-agendamento.md` seção 5). O padrão Fresha de perfil de cliente com histórico de atendimentos + notas + tags é um gap relevante para o roadmap de "Clientes" do admin. Já o fluxo de reserva pública que já implementamos (calendário mensal, ver commit `feat(ui): calendário mensal e layout centralizado na página pública`) está alinhado à ordem serviço → profissional → data/hora → confirmação descrita aqui; falta validar objetivamente se vale investir em resumo fixo (sidebar/rodapé), já que não achamos essa confirmação nas fontes públicas da Fresha.

---

## Booksy

**Contexto de uso**: concorrente direto da Fresha, também usado por barbearias e estúdios de tatuagem — relevante especificamente para o padrão de preço variável ("a partir de"), citado no nosso `Service.price` que hoje é fixo.

**O que observamos**:
- O fluxo de reserva do Booksy também é por etapas (não uma tela única): seleção do serviço "principal" (com possíveis variantes de duração/preço dentro do mesmo serviço) → seleção de horário, respeitando um intervalo de agendamento configurável (ex.: slots de 30 em 30 minutos) → perguntas adicionais opcionais definidas pelo negócio → confirmação (fonte: [How can I book an appointment?](https://help.booksy.com/hc/en-us/articles/21615958266770-How-can-I-book-an-appointment) e [Guide to setting up your Services](https://support.booksy.com/hc/en-us/articles/20706548191378-Guide-to-setting-up-your-Services)).
- Em páginas reais de negócios de tatuagem no Booksy (ex.: [listagem de estúdios em Harlem](https://booksy.com/en-us/s/tattoo-shop/25_harlem)), os serviços aparecem **agrupados por categoria/tipo** — a página de busca já filtra por "Tattoo Session", "Tattoo Consultation", "Tattoo Removal", "Temporary Tattoos" etc.
- O preço de serviços sem valor fixo é exibido com o padrão **valor + sinal de "+"** junto à duração, por exemplo: *"QUARTER SLEEVE TATTOO WRIST TO ELBOW! $650.00+3h 30min"*, *"Tattoo Minimum $100.00+1h"*, enquanto serviços de preço fechado aparecem sem o "+" (ex.: *"Small Tattoo $100.00 45min"*). Ou seja, o "+" ao lado do valor cumpre o papel do nosso conceito de preço "a partir de" (fonte: página do Booksy citada acima).

**Como se aplica ao nosso caso**: o CLAUDE.md do projeto já prevê preço "a partir de" como feature flag de vertical (tatuagem/estética). O padrão Booksy de sufixo "+" ao lado do preço é uma referência objetiva de como comunicar isso de forma compacta perto do preço e duração, sem precisar de um texto longo tipo "a partir de". O agrupamento por categoria de serviço também é um gap: hoje nosso `Service` não tem conceito de categoria — é um ponto a considerar para negócios com catálogo maior (clínica de estética, estúdio com muitos procedimentos).

---

## Trinks

**Contexto de uso**: um dos sistemas de agendamento para salões/barbearias mais usados no mercado brasileiro. Relevante aqui só para a nomenclatura em português, já que nosso produto é 100% pt-BR.

**O que observamos**:
- Trinks usa o termo **"comissão"** diretamente (não usa sinônimos como "repasse" ou "royalties") ao descrever a divisão automática do valor recebido entre estabelecimento e profissionais (fonte: [Controle Financeiro Simplificado: Fluxo de Caixa e Comissões](https://negocios.trinks.com/solucoes/simplificar-financas/)).
- A tela/fluxo de fechamento do dia é chamada de **"fechamento de caixa"** — há inclusive um artigo de ajuda dedicado com esse nome exato, e um "Fechamento Mensal" para o fechamento agregado do mês (fontes: [Como realizar fechamento de caixa](https://ajuda.trinks.com/como-realizar-fechamento-de-caixa), [Fechamento Mensal](https://ajuda.trinks.com/fechamento-mensal)).
- O sistema também tem o conceito de "Fechar Conta" (fechamento de uma comanda/atendimento individual) via app do profissional (fonte: [Fechar Conta através do Aplicativo Trinks Profissional](https://ajuda.trinks.com/fechar-conta-atraves-do-aplicativo-trinks-profissional)), distinto do fechamento de caixa do dia todo.
- Existe também o modelo alternativo de "aluguel de cadeira" como contraponto ao modelo de comissão — o próprio Trinks publica conteúdo comparando os dois modelos de remuneração de profissional (fonte: [blog Trinks](https://blog.trinks.com/aluguel-cadeira-barbearia-comissao/)), o que reforça que "comissão" é o termo padrão de mercado (o outro modelo tem nome próprio e diferente).

**Como se aplica ao nosso caso**: nosso CLAUDE.md já usa "Comissão" no glossário do domínio ("% por profissional aplicada sobre o recebido no período") — está alinhado ao termo de mercado confirmado aqui. Já não temos hoje, no escopo documentado, uma tela equivalente a "fechamento de caixa" (fechamento do dia/período agregando os recebimentos) — é um gap de nomenclatura e de funcionalidade a considerar para o módulo Financeiro do admin.

---

## AppBarber

**Contexto de uso**: sistema brasileiro focado especificamente em barbearias (nicho mais próximo do nosso seed de exemplo, "Navalha de Ouro"), útil para confirmar se a nomenclatura da Trinks é específica dela ou é um padrão do setor.

**O que observamos**:
- AppBarber também usa **"comissões"** como termo, calculadas como percentual sobre serviços e produtos vendidos, geradas no momento do agendamento/lançamento na comanda mas só efetivadas quando o atendimento é finalizado (fonte: [Como funcionam as comissões?](https://appbarber-appbeleza.zendesk.com/hc/pt-br/articles/360021152412-Como-funcionam-as-comiss%C3%B5es)).
- O relatório de comissões fica em um caminho de menu do tipo **"Financeiro > Comissões"** — ou seja, "Financeiro" é a seção-mãe, e "Comissões" um item dentro dela (fonte: mesma página acima).
- O fechamento do dia também é chamado de **"fechamento de caixa"**, igual ao Trinks — reforça que este é o termo consolidado no mercado brasileiro, não uma escolha isolada de um concorrente (fonte: [Estou tentando reabrir uma comanda de um caixa fechado](https://appbarber-appbeleza.zendesk.com/hc/pt-br/articles/360001571051-Estou-tentando-reabrir-uma-comanda-de-um-caixa-fechado-como-proceder)).
- O painel administrativo (WebAdmin) é descrito como tendo controle por profissional, histórico de clientes, estoque e "relatórios financeiros" — sugerindo que "Financeiro" e "Relatórios" convivem como conceitos relacionados, mas a citação não deixa claro se são o mesmo item de menu ou itens separados.

**Como se aplica ao nosso caso**: confirma de forma independente (dois produtos brasileiros distintos) que **"comissão"** e **"fechamento de caixa"** são os termos que o mercado já reconhece — recomendação objetiva de nomenclatura para quando o módulo Financeiro do admin for além do registro de pagamento já descrito no CLAUDE.md. O caminho "Financeiro > Comissões" do AppBarber é um dado concreto para pensar na hierarquia de navegação do nosso `/admin/financeiro` (hoje nosso CLAUDE.md já lista "Financeiro" como item de primeiro nível do admin, separado de "Relatórios" — isso está alinhado ao padrão observado).

---

## Cal.com

**Contexto de uso**: ferramenta open source de agendamento, citada no nosso escopo como referência de simplicidade de calendário e do fluxo "sem conta" — aqui pesquisada especificamente para nomenclatura de campos de política de agendamento (antecedência mínima e janela futura), que hoje não existem no nosso schema/documentação.

**O que observamos**:
- Cal.com chama a antecedência mínima de **"Minimum notice"**, configurável combinando minutos, horas e dias (o usuário define o período de antecedência exigido antes que alguém possa reservar um horário) — fica na aba/seção **"Limits"** das configurações do tipo de evento (fontes: [Minimum notice - Cal.com Help](https://cal.com/help/event-types/min-notice), [Setting Up Minimum Notice Period](https://cal.com/blog/setting-up-minimum-notice-period-in-scheduling)).
- Para a janela máxima de agendamento futuro, o campo/recurso é **"Limit future bookings"**, também dentro de "Limits", com opção adicional de contar **"Calendar Days"** (dias corridos) vs. **"Work Days"** (dias úteis) — ou seja, a unidade não é só "dias", há uma escolha explícita de tipo de dia (fontes: [A guide to Cal.com's event settings and features](https://cal.com/blog/a-guide-to-cal-com-s-event-settings-and-features), [Set booking limits in Cal.com](https://cal.com/blog/booking-limits-frequency-duration-future)).

**Como se aplica ao nosso caso**: hoje nosso `docs/escopo-sistema-agendamento.md` não define regras de antecedência mínima nem janela máxima futura de agendamento — é uma lacuna de regra de negócio (o CLAUDE.md pede para perguntar antes de assumir regra de negócio não descrita). Os nomes de campo do Cal.com ("Minimum notice", "Limit future bookings", distinção dias corridos/dias úteis) são uma referência direta e objetiva de nomenclatura e de granularidade (minutos/horas/dias) para propor esses campos como configuração do negócio, provavelmente em `Business` ou em preset de vertical.

---

## Calendly

**Contexto de uso**: referência de mercado mais madura para simplicidade de agendamento sem conta; pesquisada aqui pelo mesmo motivo que o Cal.com — nomenclatura de antecedência mínima e janela de agendamento.

**O que observamos**:
- Calendly usa o termo **"Minimum scheduling notice"**, configurado dentro da seção **"Availability" → "Date-range"** de cada tipo de evento; a unidade exibida no exemplo oficial é horas (ex.: "4 hours") (fonte: [How to fine-tune your availability settings](https://calendly.com/help/how-to-fine-tune-your-availability-settings)).
- Para a janela futura, o campo é o **"Booking date range"** (ou "Date-range"), com três modos possíveis: (1) número de dias no futuro — podendo escolher entre dias corridos ("calendar days") ou "week days" (dias úteis); (2) uma janela de datas específica ("within a date range"); ou (3) sem limite ("indefinitely into the future") (fonte: mesma página acima).

**Como se aplica ao nosso caso**: confirma, de forma independente do Cal.com, que o mercado usa duas configurações distintas — uma para antecedência mínima ("minimum notice"/"minimum scheduling notice") e outra para o horizonte máximo futuro ("limit future bookings"/"booking date range") — e que ambos os produtos oferecem a opção de contar em dias corridos ou dias úteis. Isso é um padrão consistente o suficiente (dois produtos concordando) para servir de base ao desenhar os nomes de campo em português (ex. "antecedência mínima para agendar" e "janela máxima de agendamento futuro", já citados no pedido desta pesquisa) quando essa regra de negócio for proposta formalmente.

---

## Linear

**Contexto de uso**: referência de painel/produto B2B bem avaliado por organização de navegação densa e por padrões de interação (drawer vs. modal), relevante para o admin do nosso SaaS, que já tem 8 itens de menu (Início, Agenda, Clientes, Profissionais, Serviços, Financeiro, Relatórios, Mensagens, Configurações).

**O que observamos**:
- A sidebar do Linear é organizada em **seções temáticas** (ex. seção "Workspace" agrupando "Teams" e "Customers"), e o produto permite ao usuário **personalizar** a sidebar: ocultar itens pouco usados atrás de um menu **"More"**, reordenar itens por drag-and-drop, e customizar via clique direito ("Customize sidebar") (fonte: [Personalized sidebar and new settings pages – Linear Changelog](https://linear.app/changelog/2024-12-18-personalized-sidebar)).
- Para o detalhe de um registro (issue), o padrão predominante descrito por múltiplas fontes de design é o **drawer/painel lateral deslizante** ("side peek"), que abre ao lado do conteúdo (preservando a lista visível), diferente do modal, que bloqueia a tela toda para exigir uma decisão pontual. A recomendação geral do mercado (não específica só do Linear) é: modal para uma decisão curta e bloqueante; drawer quando o usuário precisa manter a lista de fundo visível/no contexto (fonte: [Modal vs Drawer: When to Use Each UI Pattern](https://www.onething.design/post/modal-vs-drawer), que cita explicitamente "Linear and Asana open task details in a right-side drawer"). Para fluxos mais longos e complexos, a recomendação geral é usar página dedicada em vez de drawer ou modal.
- Para ações em linha de tabela, o padrão observado (não exclusivo do Linear, mas amplamente citado como boa prática de mercado) é agrupar as ações da linha em um único menu **"kebab" (ícone de três pontos, "...")** no final da linha, em vez de vários ícones de ação separados — e usar texto (não só ícone) dentro desse menu para clareza. Um cuidado de acessibilidade citado: ações que só aparecem no hover do mouse ficam invisíveis para quem navega por teclado ou toque, então precisa haver uma forma de acioná-las sem depender de hover (fontes: [Table Design UX Guide](https://www.eleken.co/blog-posts/table-design-ux), [Designing Effective Contextual Menus – NN/g](https://www.nngroup.com/articles/contextual-menus-guidelines/)).

**Como se aplica ao nosso caso**: nosso CLAUDE.md já define a regra "detalhes de um registro abrem em drawer; modal só para confirmação ou ação curta; formulário longo vira página" — o padrão do Linear (e a literatura de design geral) confirma exatamente essa escolha já feita, então aqui é mais validação do que gap. O ponto de gap real é a **navegação do admin**: com 8-9 itens de primeiro nível hoje sem agrupamento nem colapso, o padrão Linear de seções + "More" é uma referência concreta para quando a sidebar crescer (ex. ao adicionar mais telas de configuração ou relatórios). O padrão de menu "..." por linha em tabela também é diretamente aplicável às listagens do admin (Clientes, Profissionais, Serviços, Agendamentos) que hoje não têm essa análise documentada.

---

## Vercel (dashboard)

**Contexto de uso**: referência de produto B2B/devtool com navegação em dois níveis (time → projeto) e volume grande de itens de configuração, útil para pensar a hierarquia Configurações do negócio > sub-seções no nosso admin.

**O que observamos**:
- O dashboard atual (redesenho lançado e já como padrão desde fevereiro de 2026) usa uma **sidebar redimensionável**, com navegação lateral **unificada e consistente entre o nível de time e o nível de projeto**, ícones + texto, indicadores de status, e itens reordenados para priorizar os fluxos mais comuns (fonte: [New dashboard navigation available](https://vercel.com/changelog/new-dashboard-navigation-available), [dashboard redesign is now the default](https://vercel.com/changelog/dashboard-navigation-redesign-rollout)).
- Dentro de "Project Settings", os itens ficam agrupados em seções como **General, Build and Deployment, Environment Variables, Domains, Cron Jobs, Git & Repository, e Security & Danger Zone** — ou seja, a divisão de "Configurações" em blocos temáticos, cada um como uma sub-seção da própria tela de configurações, não como itens soltos na sidebar principal (fonte: [Tour the Dashboard – Vercel Academy](https://vercel.com/academy/optimize-your-vercel-account/tour-the-dashboard)).
- Em mobile, a sidebar pode ser ocultada e dá lugar a uma **barra inferior flutuante** para navegação (fonte: mesma fonte acima).

**Como se aplica ao nosso caso**: o nosso admin tem uma tela "Configurações" que provavelmente vai crescer (dados do negócio, horário de funcionamento, identidade visual, políticas de reserva, notificações etc.) — o padrão Vercel de dividir "Configurações" em seções internas nomeadas (em vez de itens soltos na sidebar principal ou uma página única e longa) é diretamente relevante. O padrão de navegação inferior no mobile também confirma a diretriz que já está no CLAUDE.md do projeto ("navegação inferior" no admin mobile).

---

## Síntese

Padrões que parecem mais relevantes para o roadmap do projeto, a validar e priorizar no documento de plano de implementação:

- **Financeiro com "Comissão" e "Fechamento de caixa"**: dois produtos brasileiros de nicho (Trinks e AppBarber) usam esses termos de forma consistente — recomendação objetiva de nomenclatura em pt-BR para o módulo Financeiro do admin, que hoje registra pagamento mas não tem um conceito de fechamento agregado por período.
- **Categoria de serviço**: Booksy agrupa serviços por categoria e usa sufixo "+" para preço variável — gap no nosso `Service` (sem categoria) e reforço de como comunicar preço "a partir de" de forma compacta.
- **Perfil de cliente mais rico**: Fresha mostra histórico completo (aba de atendimentos/vendas), notas e tags no perfil do cliente — gap frente ao nosso `Client` atual, que é só identificação básica.
- **Políticas de reserva (antecedência mínima e janela futura)**: Cal.com e Calendly convergem em ter dois campos distintos, com unidade configurável (minutos/horas/dias, e dias corridos vs. dias úteis) — regra de negócio ainda não descrita no nosso escopo; precisa virar pergunta explícita antes de virar schema, conforme o próprio CLAUDE.md exige.
- **Navegação do admin em seções**: Linear (sidebar com agrupamento + "More") e Vercel (Configurações dividida em sub-seções temáticas) são referências diretas para quando nossa sidebar de 8-9 itens crescer, e para estruturar internamente a tela de Configurações em vez de um formulário único e longo.
- **Drawer vs. modal vs. página**: já é regra no nosso CLAUDE.md e a pesquisa (Linear, Asana citados como exemplo de mercado) apenas confirma a escolha — não é gap, é validação.
- **Lacunas de pesquisa a registrar**: não conseguimos confirmar com confiança a estrutura exata da sidebar do painel do Fresha (itens e ordem), nem a existência de uma barra de resumo fixa no rodapé mobile ou sidebar fixa de resumo no fluxo de reserva da Fresha — fontes públicas de ajuda descrevem conteúdo, não a disposição visual exata. Qualquer decisão de design nesses dois pontos deve se apoiar em outras referências (ex. inspeção direta de um app real) e não nesta pesquisa.
