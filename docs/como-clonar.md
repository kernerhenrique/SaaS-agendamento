# Como entregar um cliente novo

> Fase 7. A Aprazzo é **um sistema só para todos os clientes** (multi-inquilino): um app, um banco, cada negócio em `aprazzo.com.br/{slug}` com a própria marca, nicho e dados. "Criar um cliente" é **cadastrar um negócio pronto**, não copiar código. Publicação do app (uma vez só): `docs/publicacao.md`. Venda e preços: `docs/guia-de-vendas.md`.

## 1. Juntar os dados do cliente

Pedir ao dono (formulário de onboarding, ver guia de vendas):
- nome do negócio, endereço, WhatsApp e Instagram;
- **logo** (PNG/SVG, quadrada) e **capa** (foto larga, 1600×900 ou maior), até 4 MB cada;
- cor da marca (ou tirar da logo);
- horário de funcionamento;
- serviços com duração e preço (sem isso, entra o catálogo padrão do nicho);
- equipe: nome, especialidade, comissão e expediente de cada um;
- políticas: antecedência mínima, até quantos dias a agenda abre, prazo para cancelar e o recado das regras da casa.

## 2. Montar o arquivo do cliente

Em `clientes/<slug>.json` (a pasta fica **fora do git**: são dados do cliente), no formato de `docs/exemplo-cliente.json`. Imagens ao lado, em `clientes/<slug>/`.

| Campo | Formato | Observação |
|---|---|---|
| `nome`, `endereco`, `instagram` | texto | Instagram aceita `@perfil` ou o link |
| `slug` | `barbearia-do-ze` | opcional (sai do nome); 3–50 caracteres; não pode ser reservado (`admin`, `precos`, `termos`…, ver `src/lib/reserved-slugs.ts`) e **não muda depois** |
| `nicho` | `barbershop`, `beauty_clinic`, `tattoo_studio`, `generic` | troca termos e recursos (`src/config/vertical.ts`); não muda pela tela |
| `whatsapp` | `(19) 99999-0000` | gravado só com dígitos |
| `cor` | `#B45309` | o comando avisa se o contraste ficar ruim |
| `logo`, `capa` | caminho relativo ao JSON | enviados ao Vercel Blob |
| `horarioFuncionamento` | `[{ "dias": "ter-sex", "horario": "09:00-20:00" }]` | dias: `dom seg ter qua qui sex sab`, intervalos (`seg-sex`) e listas (`seg,qua`) |
| `politicas` | `antecedenciaMinutos`, `janelaDias`, `cancelamentoHoras`, `texto` | opcional; padrão 0 min, 60 dias, 0 h |
| `servicos` | `{ nome, categoria, duracao, preco, aPartirDe, descricao }` | opcional: sem a lista, entra o catálogo do nicho (`onboarding/niche-catalogs.ts`); preço `40` ou `"45,90"` |
| `profissionais` | `{ nome, especialidade, comissao, cor, servicos, expediente }` | pelo menos um; sem `expediente` segue o horário do negócio; sem `servicos` faz todos; `expediente` aceita `intervalo` (`"12:00-13:00"`) |

## 3. Conferir no banco local

```
npm run novo-cliente -- clientes/barbearia-do-ze.json --simular   # só valida e mostra o resumo
npm run novo-cliente -- clientes/barbearia-do-ze.json             # cria no banco local
```
O comando mostra os avisos (cor clara, serviço que ninguém faz, falta de WhatsApp), cria tudo numa transação e imprime a mensagem para o dono e o checklist. Abrir `http://localhost:3000/<slug>` e conferir. Recusa sozinho se a `DATABASE_URL` não for o banco local.

## 4. Criar em produção

Preparação (uma vez por computador; o token do Blob dura cerca de 12 h, então repita o `env pull` se o comando pedir):
```
npx vercel login
npx vercel link --yes --project saa-s-agendamento
npx vercel env pull .env.vercel.local --environment=production --yes   # credenciais do Blob
```
e o arquivo `.env.producao.local` com uma linha `DATABASE_URL="…"` (string pooled do Neon), colada à mão: as variáveis sensíveis não vêm no `env pull`.

**Nunca chame nenhum deles de `.env.production.local`**: o Next carrega esse nome sozinho em `next build`/`next start` e o servidor local passaria a usar produção.

O Blob precisa estar conectado também ao ambiente **Development** (Storage → aprazzo-arquivos → Projects): o token do `env pull` é sempre de desenvolvimento.

```
npm run novo-cliente -- clientes/barbearia-do-ze.json --producao
```

## 5. Entregar

1. Seguir o checklist impresso pelo comando: abrir a página no celular, fazer e cancelar uma reserva de teste, conferir preços e expedientes.
2. Mandar ao dono a mensagem pronta: o **link de primeiro acesso** (7 dias, uso único; ele cria o próprio e-mail e senha, ninguém mais vê) e o link da página para a bio do Instagram.
3. O dono convida a equipe em Profissionais › Dados › "Acesso ao painel".
4. Check-in de 7 dias.

Se o link do dono expirar antes do uso: gerar outro com `createOwnerInvite(businessId)` (`staff.service.ts`), que invalida o anterior.

## O que o dono ajusta sozinho depois

Em **Configurações**: nome, endereço, WhatsApp, Instagram, logo e capa (por link), cor, horário, políticas e a própria senha. Em **Serviços** e **Profissionais**: catálogo, equipe, expedientes e comissões. Slug, fuso e nicho ficam de fora de propósito (ver CLAUDE.md).

## Nunca muda entre clientes

Lógica de disponibilidade, autenticação, isolamento multi-tenant e schema. Melhorias entram neste repositório e valem para todos na próxima publicação. Projetos derivados (ex.: SaaS-psi) puxam pelo `upstream`.
