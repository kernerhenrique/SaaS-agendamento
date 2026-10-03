# Publicação (Vercel + Neon + domínio na Hostinger)

> Fase 7, Bloco A. Um app e um banco para todos os clientes (multi-inquilino): esta publicação é feita **uma vez**. Cada cliente novo depois é só um cadastro (`npm run novo-cliente`, Bloco B).

## Como o deploy funciona

- `vercel.json` define a região das funções em **São Paulo** (`gru1`, perto do banco) e o comando de build:
  1. `prisma generate` (o client do Prisma não fica no git);
  2. **só em produção** (`VERCEL_ENV=production`): `prisma migrate deploy` aplica as migrations pendentes, usando a conexão direta (`DATABASE_URL_UNPOOLED`) quando existir. Deploys de preview **não** mexem no banco;
  3. `next build`.
- O banco de produção **não** recebe o seed de teste (Navalha de Ouro). Os negócios entram pelo script do Bloco B.
- Todo `git push` na `master` gera um deploy de produção automaticamente.

## Passo a passo (uma vez só)

Nenhuma senha ou string de conexão passa pelo chat nem pelo git: tudo é colado direto no painel da Vercel.

### 1. Neon (banco)
1. Criar um projeto **Aprazzo**, região **AWS São Paulo (sa-east-1)**, Postgres 17.
2. Em **Connect**, copiar duas strings:
   - com **Connection pooling ligado** (o host tem `-pooler`) → será `DATABASE_URL`;
   - com **Connection pooling desligado** → será `DATABASE_URL_UNPOOLED`.

### 2. Segredo do login (JWT)
Num terminal **seu** (não no Claude Code, para o valor não aparecer na conversa):
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
O resultado será `JWT_SECRET`. Guarde num gerenciador de senhas.

### 3. E-mail de envio (`nao-responda@aprazzo.com.br`)
Uma caixa só envia para todos os negócios. O cliente final vê o **nome do negócio** no "De:" ("Barbearia do Zé" `<nao-responda@aprazzo.com.br>`), e o **"Responder para"** é o e-mail do dono, então a resposta chega à barbearia. Os avisos ao dono e o "esqueci a senha" saem como "Aprazzo". Não dá para enviar *do* e-mail da barbearia: o servidor não está autorizado naquele domínio (SPF/DKIM) e cairia no spam.
1. Hostinger → **E-mails** → criar a caixa `nao-responda@aprazzo.com.br`.
2. Na mesma tela, deixar a Hostinger configurar o DNS do e-mail (**MX, SPF, DKIM**; DMARC recomendado). Não mexe nos registros `A`/`CNAME` da Vercel.
3. Dados do SMTP: `smtp.hostinger.com`, porta `465` (SSL), usuário = o próprio endereço, senha = a senha da caixa.

A caixa da Hostinger tem limite diário de envio (ver o plano). Se apertar, trocar por um serviço transacional (Resend, Brevo) com o mesmo domínio: só mudam as variáveis `SMTP_*`. O Gmail (`GMAIL_USER` + `GMAIL_APP_PASSWORD`, senha de app) ainda funciona se as `SMTP_*` não existirem. Sem nenhum dos dois, o sistema funciona e só registra o e-mail no log.

### 4. Vercel (app)
1. **Add New → Project**, importar o repositório `SaaS-agendamento` do GitHub. O framework (Next.js) é detectado; o comando de build vem do `vercel.json`.
2. Em **Environment Variables** (ambiente *Production*), cadastrar:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | string pooled do Neon |
| `DATABASE_URL_UNPOOLED` | string direta do Neon |
| `JWT_SECRET` | valor do passo 2 |
| `APP_BASE_URL` | `https://aprazzo.com.br` |
| `SMTP_HOST` | `smtp.hostinger.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `nao-responda@aprazzo.com.br` |
| `SMTP_PASS` | senha da caixa (marcar como *Sensitive*) |
| `EMAIL_FROM` | `nao-responda@aprazzo.com.br` |
| `CRON_SECRET` | outro valor aleatório gerado como no passo 2; a Vercel o envia ao chamar a rotina da madrugada das demos (`vercel.json` → `/api/cron/demos`). Sem ele, a rotina recusa |

3. **Deploy**. No log do build deve aparecer "All migrations have been successfully applied".
4. Conferir o endereço provisório `*.vercel.app`: a página inicial da Aprazzo e `/admin/login` devem abrir.

Plano: o **Hobby** (grátis) serve para montar e testar; ele proíbe uso comercial, então assine o **Pro** antes de entregar o primeiro cliente pagante.

### 5. Domínio (Hostinger → Vercel)
1. Na Vercel: projeto → **Settings → Domains** → adicionar `aprazzo.com.br` e `www.aprazzo.com.br` (redirecionando para o sem www). A Vercel mostra os registros exatos a criar.
2. Na Hostinger: **Domínios → aprazzo.com.br → DNS / Nameservers**:
   - apagar os registros `A` e `AAAA` de `@` que apontam para a hospedagem da Hostinger (e o `CNAME` de `www`, se houver);
   - criar o `A` de `@` e o `CNAME` de `www` com os valores mostrados pela Vercel (normalmente `A @ 76.76.21.21` e `CNAME www cname.vercel-dns.com`).
   - Não mexer em registros `MX`/`TXT` de e-mail, se existirem.
3. A propagação leva de minutos a algumas horas. A Vercel emite o HTTPS sozinha quando o domínio aponta certo.

### 6. Conferência final
- `https://aprazzo.com.br` abre a página inicial; `/admin/login` abre o login.
- Depois do Bloco B: criar um negócio de demonstração, fazer uma reserva real pelo celular, receber o e-mail e colar o link no WhatsApp para ver a prévia com logo e nome.

## Limitações conhecidas em produção
- **Rate limit em memória**: na Vercel podem existir várias instâncias ao mesmo tempo, então o limite por IP vale por instância (ver CLAUDE.md). Redis/Upstash só quando pedido.
- **Migrations no build**: se o build falhar depois de aplicar uma migration, o banco fica à frente do código até o próximo deploy. As migrations do projeto são aditivas, então o código anterior continua funcionando.
