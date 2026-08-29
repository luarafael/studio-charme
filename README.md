# Studio Charme

Aplicação web do Studio Charme: site institucional, agendamento on-line e área
interna individual para as profissionais, com agenda, clientes e controle
financeiro.

O projeto nasceu como um site estático (preservado em [`legacy/`](./legacy)) e
está sendo reconstruído como monorepo com frontend em React e API própria.

## Arquitetura

```
apps/
  web/        React + TypeScript + Vite + Tailwind CSS   -> Vercel
  api/        Fastify + TypeScript + Prisma              -> Railway
packages/
  contracts/  schemas Zod, tipos e regras compartilhadas
  config/     configurações compartilhadas de TypeScript e ESLint
legacy/       site estático original, mantido como referência
```

O repositório é um **monorepo pnpm**. Cada pasta em `apps/` e `packages/` é um
pacote independente (`@studio-charme/web`, `@studio-charme/api`,
`@studio-charme/contracts`, `@studio-charme/config`), ligados por
`workspace:*`. Um único `pnpm install` na raiz instala tudo.

Regra fundamental: **o frontend nunca acessa o banco diretamente.** Toda leitura
e escrita privada passa pela API, que é a única a conhecer a `DATABASE_URL` e a
aplicar o isolamento de dados entre as profissionais.

| Camada      | Tecnologia                                                     |
| ----------- | -------------------------------------------------------------- |
| Frontend    | React 19, TypeScript, Vite, Tailwind CSS v4, React Router      |
| Estado      | TanStack Query                                                 |
| Formulários | React Hook Form + Zod                                          |
| API         | Node.js, TypeScript, Fastify                                   |
| Banco       | PostgreSQL no Neon, via Prisma ORM com migrations              |
| Sessão      | cookie `HttpOnly` + `Secure` + `SameSite`, senhas com Argon2id |
| Testes      | Vitest, React Testing Library e Playwright                     |
| Fuso        | `America/Fortaleza` em toda regra de agenda                    |

## Requisitos

- Node.js 20 ou superior (desenvolvido com 26)
- pnpm 11 (`npm install -g pnpm`)
- PostgreSQL: uma instância no [Neon](https://neon.tech) ou local para desenvolvimento

## Instalação

```bash
pnpm install
```

Alguns pacotes compilam binários nativos (`argon2`, `sharp`, `esbuild`) ou geram
código (`prisma`). O pnpm bloqueia esses scripts por padrão; os permitidos estão
declarados em `onlyBuiltDependencies` no `pnpm-workspace.yaml`. Se a instalação
avisar sobre builds ignorados, rode:

```bash
pnpm rebuild
```

## Variáveis de ambiente

O arquivo [`.env.example`](./.env.example) documenta todas as variáveis, separadas
por aplicação, e **não contém segredos**.

```bash
# API
cp .env.example apps/api/.env
# Frontend (apenas valores públicos)
cp .env.example apps/web/.env.local
```

Gere os segredos aleatórios com:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Pontos de atenção:

- No `apps/web/.env.local` mantenha somente as variáveis `VITE_*`. Tudo com esse
  prefixo é embutido no bundle e fica visível para qualquer visitante.
- `DATABASE_URL`, `SESSION_SECRET` e credenciais de e-mail e armazenamento vivem
  exclusivamente no `apps/api/.env`.
- `WEB_ORIGINS` lista as origens autorizadas no CORS, sem curinga.
- A API se recusa a iniciar com configuração inválida: cookie não `Secure` em
  produção, segredo curto, origem sem HTTPS ou documentação OpenAPI exposta.

## Desenvolvimento

```bash
pnpm dev          # sobe frontend e API juntos
pnpm dev:web      # apenas o frontend  -> http://localhost:5173
pnpm dev:api      # apenas a API       -> http://localhost:3333
```

## Verificação

```bash
pnpm typecheck    # TypeScript em modo estrito, sem emitir
pnpm lint         # ESLint
pnpm test         # testes unitários e de integração (Vitest)
pnpm test:e2e     # fluxos de ponta a ponta (Playwright)
pnpm format       # aplica o Prettier
pnpm verify       # typecheck + lint + test, o mesmo que roda antes de um commit
```

## Banco de dados

```bash
pnpm db:migrate   # cria e aplica migrations em desenvolvimento
pnpm db:seed      # dados iniciais, sem senhas reais
```

O seed cria os perfis das profissionais **sem senha definida**. O primeiro acesso
é feito por convite ou recuperação de senha, então nenhuma credencial existe no
repositório.

Valores monetários são sempre inteiros em centavos, nunca `float`. Datas e
horários são convertidos considerando `America/Fortaleza`, enquanto o banco
armazena instantes em UTC.

## Estrutura do frontend

```
apps/web/src/
  app/          composição raiz, providers e Error Boundary
  components/   componentes do design system e blocos reutilizáveis
  config/       conteúdo institucional centralizado (contatos, galeria, textos)
  features/     regras por domínio (auth, agenda, clientes, financeiro...)
  layouts/      estruturas de página do site público e da área interna
  lib/          utilitários e cliente HTTP
  pages/        páginas roteadas
  routes/       definição das rotas
  styles/       design tokens e estilos base
```

Os tokens de cor, tipografia, espaçamento, raio e sombra ficam em
`apps/web/src/styles/tokens.css`. A paleta parte das três cores originais da
marca e o dourado claro nunca é usado como texto sobre fundo claro, porque não
alcança o contraste mínimo AA — existe um tom escuro específico para isso.

## Documentação relacionada

- [`legacy/README.md`](./legacy/README.md) — site original e URLs preservadas
- [`PROMPT_REFATORACAO_STUDIO_CHARME.md`](./PROMPT_REFATORACAO_STUDIO_CHARME.md) — especificação completa da refatoração
