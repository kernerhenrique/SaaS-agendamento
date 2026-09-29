# Como criar um novo cliente a partir do base

> Primeira versão (Fase 6). A Fase 7 completa este guia com seeds por nicho, o script `npm run novo-cliente` e a decisão multi-tenant × um tenant por clone.

## O que já dá para fazer sem tocar em código

Depois de subir o clone e entrar no painel com o usuário do negócio, abrir **Configurações** (`/admin/configuracoes`):

1. **Negócio**:
   - nome, endereço, WhatsApp e Instagram;
   - **tipo de negócio**, que troca os termos em todo o painel, na página pública e no e-mail (Barbeiro, Especialista, Tatuador…).
2. **Identidade**:
   - link do logo (quadrado) e da capa (foto larga);
   - cor de marca. A tela mostra o contraste e avisa quando a cor é clara demais para texto.
3. **Horário**: horário de funcionamento que aparece na página pública. A agenda de cada profissional é configurada no cadastro dele.
4. **Reservas**:
   - antecedência mínima, até quantos dias a agenda fica aberta, prazo para o cliente cancelar pelo link;
   - recado com as regras da casa.
5. **Conta**: trocar a senha inicial.

Depois: cadastrar **Serviços** e **Profissionais** (expediente, serviços que realiza, comissão) e testar uma reserva pela página pública.

## O que ainda exige código ou banco (até a Fase 7)

- Criar o negócio e o primeiro usuário: hoje só pelo seed (`prisma/seed.ts`) ou Prisma Studio.
- **Slug** (endereço da página) e **fuso horário**: definidos na criação e não editáveis pela tela (trocar o slug quebra links já compartilhados; trocar o fuso desloca a agenda).
- Marca do **produto** (nome da plataforma, logo do login, "feito com"): `src/config/brand.ts` e tokens de `src/app/globals.css`, conforme `docs/design-system.md`.

## Nunca muda entre clones

Lógica de disponibilidade, autenticação, isolamento multi-tenant e schema base. Melhorias nessas partes são feitas neste repositório e puxadas pelos clones (`git remote add upstream …`).
