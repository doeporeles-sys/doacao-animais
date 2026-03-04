# Relatório completo do projeto — Doe por Eles

**Data da análise:** 2026-03-04  
**Workspace:** `c:\Users\Vagner Antas\doacao-animais`

## 1) Visão geral

O projeto **Doe por Eles** é uma landing page de campanha de doações (frontend estático em `public/`) com um backend **Node.js/Express** (em `server/node/`) que:

- Serve os arquivos estáticos (`public/`)
- Expõe uma API REST simples (`/api/*`)
- Integra com **Mercado Pago** (Checkout Pro e PIX)
- Persiste dados em **SQLite** (arquivo em `data/doacao.db`) e prevê uso de **Knex** para migrations/seeds
- Possui também um backend **PHP** “simulado” em `server/php/` (legado/alternativo) que responde apenas `/api/campaign`

## 2) Métricas de conteúdo (inventário de arquivos)

Excluindo `node_modules/` e `.git/`, existem **58 arquivos** no workspace.

Distribuição por extensão (top):

- **.js**: 25
- **.css**: 11
- **.json**: 4
- **.html**: 3
- **.svg**: 3
- **.md**: 3
- **.php**: 2
- **.db**: 1
- **.env**: 1
- **.ps1**: 1
- **.yml**: 1
- **.gitignore**: 1
- **.exe**: 1
- **(sem extensão)**: 1

## 3) Estrutura de pastas (alto nível)

- `public/`: site (landing) + admin (estático)
- `server/`:
  - `server/node/`: servidor Express (API + static)
  - `server/migrations/`: migrations Knex
  - `server/seeds/`: seeds Knex
  - `server/php/`: alternativa/legado com PHP built-in server
- `data/`: banco SQLite (`doacao.db`)
- `scripts/`: utilitários (ex.: `inspect-db.js`)
- `backup_removed_20260222_031922/`: backup de versão antiga (HTML/CSS/JS inline + script de iniciar via Python)
- `ngrok.exe`: binário do ngrok (grande)

## 4) Stack e dependências

### 4.1 Node.js (raiz)

Arquivo: `package.json`

- **Scripts**:
  - `npm start`: `node server/node/index.js`
  - `npm run dev`: `nodemon server/node/index.js`
  - `npm run migrate`: `knex migrate:latest`
  - `npm run seed`: `knex seed:run`
  - `npm run db:reset`: `knex migrate:rollback && knex migrate:latest && knex seed:run`
  - `npm run db:inspect`: `node scripts/inspect-db.js`
- **Dependências (principais)**: `express`, `helmet`, `cors`, `express-rate-limit`, `jsonwebtoken`, `bcryptjs`, `knex`, `better-sqlite3`, `pino`

### 4.2 Node.js (subprojeto em `server/node/`)

Arquivo: `server/node/package.json`

Existe um `package.json` adicional dentro de `server/node/` com dependências diferentes (inclui `mongoose`, `express@5`, etc.). No código analisado, **não há uso de Mongoose** nem MongoDB.

**Impacto prático:** se você rodar o servidor (`node server/node/index.js`) e existir `server/node/node_modules`, o Node tende a resolver `require('express')`, `helmet`, etc. a partir dali — ou seja, você pode acabar executando com versões diferentes das do `package.json` da raiz, dependendo de como o ambiente foi instalado.

## 5) Frontend (UI)

### 5.1 Landing page

- **Entrada:** `public/index.html`
- **CSS em uso:** `public/css/styles.css`
- **JS em uso:** `public/js/main.js`
- **Seções:** Hero, Problema, Recursos, Metas (barra de progresso), Doação, Footer
- **Modal PIX:** embutido em `index.html` (com QR Code, copiar código, abrir link, verificar status)

### 5.2 Admin dashboard (estático)

- **Entrada:** `public/admin.html`
- **CSS:** `public/admin.css`
- **JS:** `public/admin.js`
- **Gráfico:** Chart.js via CDN em `admin.html`
- **Auth:** usa JWT via `localStorage` (`admin_token`)

### 5.3 Arquivos “alternativos/refatoração” no frontend

O diretório `public/js/` contém uma versão mais modular (`api.js`, `app.js`, `config.js`, `components/*`, `utils/*`) e o diretório `public/css/` contém `main.css` com `@import` e componentes em `public/css/components/*`.

**Mas:** `public/index.html` atualmente aponta para `styles.css` e `main.js` (monolíticos). Então os arquivos “modulares” parecem ser uma alternativa não conectada ao HTML atual (ou restos de refatoração).

## 6) Backend Node (Express) — arquitetura e rotas

### 6.1 Entrypoint

Arquivo: `server/node/index.js`

Principais responsabilidades:

- Configura `dotenv`
- Aplica `helmet` (com CSP e HSTS só em produção)
- Configura `cors` (origens restritivas baseadas em `BASE_URL` + localhost em dev)
- `express.json({ limit: '64kb' })`
- Rate limit global em `/api` e rate limit específico para `/api/payments/webhook`
- Logger de request via `server/node/lib/logger.js`
- `GET /health`
- Registra rotas:
  - `/api` → `server/node/routes/public.js`
  - `/api/admin` → `server/node/routes/admin.js`
  - `/api/payments` → `server/node/routes/payments.js`
- Serve `public/` e faz fallback SPA para `index.html`
- Middleware final de erro: `server/node/middlewares/errorHandler.js`

### 6.2 Rotas públicas (campaign e donate)

Arquivo: `server/node/routes/public.js`

- `GET /api/campaign`: retorna campanha id=1 (valores em centavos)
- `POST /api/donate`: valida `amount` (centavos) com `express-validator`, faz transação: atualiza `campaign.collected` e insere em `donations` com `status='approved'`

### 6.3 Rotas admin

Arquivo: `server/node/routes/admin.js`

- `POST /api/admin/login`: autentica `admins.email` + `bcrypt` e retorna JWT (`expiresIn: 8h`)
- `GET /api/admin/stats` (JWT): agregados (confirmadas/estornadas/valor/goal)
- `GET /api/admin/donations` (JWT): lista paginada (limit/offset)

### 6.4 Rotas de pagamento (Mercado Pago)

Arquivo: `server/node/routes/payments.js`

Endpoints:

- `POST /api/payments/create`:
  - Cria preferência (Checkout Pro) em `/checkout/preferences`
  - Retorna `{ checkoutUrl }` (usa `init_point`)
  - Valida `amount` mínimo R$1, máximo R$1.000.000
- `POST /api/payments/create-pix`:
  - Cria pagamento PIX em `/v1/payments`
  - Exige `BASE_URL` HTTPS (ngrok/produção)
  - Rate limit adicional: 5/min
  - Registra/garante uma linha `donations` com `status='pending'` e `payment_id`
  - Retorna `payment_id`, `qr_code`, `qr_code_base64` (como data URL), `ticket_url`, `expires_at`
- `GET /api/payments/status?payment_id=...`:
  - Consulta `/v1/payments/{id}` e retorna `{ status, payment_id }`
- `POST /api/payments/webhook`:
  - Responde `200 OK` imediatamente e processa em background
  - **Valida assinatura** HMAC SHA256 via `x-signature` + `x-request-id` com janela de 5 minutos
  - Consulta o pagamento no MP e só confirma se `status === 'approved'`
  - Idempotência por `donations.payment_id`

## 7) Banco de dados (SQLite) + migrations/seeds (Knex)

### 7.1 Arquivo do banco

- `data/doacao.db` (SQLite)

### 7.2 Migrations

Pasta: `server/migrations/`

- `20260222_init.js`: cria `campaign`, `donations`, `admins`
- `20260222_add_payment_id.js`: adiciona `donations.payment_id`
- `20260222100000_add_payment_id_index.js`: cria índice `idx_donations_payment_id`
- `20260222110000_donations_status_approved.js`: migra `status` de `confirmed` → `approved`

### 7.3 Seeds

Pasta: `server/seeds/`

- `01_campaign.js`: reseta `donations` → `campaign` e insere campanha id=1 (centavos)
- `02_admin.js`: upsert do admin `admin@doeporeles.local` com senha **ChangeMe123!** (bcrypt 10)

### 7.4 Inspeção do banco (sem Knex)

Arquivo: `scripts/inspect-db.js`

Abre `data/doacao.db` com `better-sqlite3` e lista tabelas/colunas/índices.

## 8) Backend PHP (legado/alternativo)

Pasta: `server/php/`

- `server/php/router.php`: roteador para `php -S`, serve `public/` e implementa `/api/campaign` chamando:
- `server/php/api/campaign.php`: endpoint simulado com valores em **reais** (não centavos), e `Access-Control-Allow-Origin: *`

**Observação:** esse backend PHP não está alinhado com o backend Node (formatos de valor, CORS permissivo, etc.) e parece existir como alternativa antiga/simulada.

## 9) Docker e operação

### 9.1 docker-compose

Arquivo: `docker-compose.yml`

- Sobe o serviço `app` na porta `8080`
- Usa volume `doacao-data` para persistir `/app/data` (SQLite)
- Passa envs principais (`JWT_SECRET`, `MERCADO_PAGO_ACCESS_TOKEN`, `BASE_URL`)

### 9.2 Dockerfile

Arquivo: `Dockerfile`

- Base: `node:18-alpine`
- `npm ci --only=production`
- Copia `server/`, `public/` e **tenta** copiar `knexfile.js`
- Executa migrations no build: `npx knex migrate:latest || true`
- `CMD ["node", "server/node/index.js"]`

## 10) Variáveis de ambiente (conforme README + código)

Sem expor valores sensíveis, as chaves usadas no projeto são:

- `NODE_ENV` (ex.: `production`)
- `PORT` (default 8080)
- `BASE_URL` (em PIX/webhook precisa ser **HTTPS**)
- `JWT_SECRET` (obrigatório para login/admin)
- `MERCADO_PAGO_ACCESS_TOKEN` (obrigatório para criar pagamentos)
- `MERCADO_PAGO_WEBHOOK_SECRET` (obrigatório em produção para validar assinatura do webhook)
- `WEBHOOK_DEBUG` (`true/false`)
- `PAYMENT_DEBUG` (`true/false`)
- `LOG_LEVEL` (para pino em `public.js`)

## 11) Segurança — o que existe hoje

- **Helmet** com CSP configurada e HSTS só em produção (`server/node/index.js`)
- **CORS restritivo** (baseado em `BASE_URL` + localhost em dev)
- **Rate limit**:
  - `/api` global: 100 req / 15 min
  - `/api/payments/webhook`: 30 req / min
  - `/api/payments/create-pix`: 5 req / min
- **JWT** para rotas admin (`server/node/middlewares/auth.js`)
- **Error handler** que evita vazar stack em produção (`server/node/middlewares/errorHandler.js`)
- **Webhook Mercado Pago com assinatura HMAC + anti-replay** (janela 5 minutos) em `server/node/routes/payments.js`

## 12) Pontos de atenção (achados importantes no estado atual do workspace)

### 12.1 Backend quebrado por arquivo ausente (`server/node/db.js`)

As rotas `public.js`, `admin.js`, `payments.js` fazem `require('../db')` para obter uma instância do Knex:

- `server/node/routes/public.js`
- `server/node/routes/admin.js`
- `server/node/routes/payments.js`

Porém, **não existe** `server/node/db.js` (nem `server/node/db/index.js`) no workspace analisado.

**Consequência:** o servidor **não sobe** no estado atual (vai falhar no `require('../db')`).

### 12.2 Scripts de Knex e Dockerfile referenciam `knexfile.js`, mas ele não existe

- `package.json` usa comandos `knex migrate:*` e `knex seed:*`
- `Dockerfile` faz `COPY knexfile.js ./`

Porém, **não existe** `knexfile.js` na raiz do projeto neste workspace.

**Consequência:** migrations/seeds via `npx knex ...` tendem a falhar (sem configuração).

### 12.3 Dois `package.json` (raiz e `server/node/`) com versões divergentes

Isso pode gerar comportamento diferente dependendo de onde as dependências estão instaladas (principalmente se existir `server/node/node_modules`).

### 12.4 `ngrok.exe` dentro do projeto

O arquivo `ngrok.exe` (~32 MB) está presente. Se estiver versionado, isso:

- aumenta muito o repositório
- pode conflitar com políticas internas de segurança/antivírus
- costuma ser melhor gerenciado por instalação separada (ou download no setup)

### 12.5 “Código legado/backup” no repo

- Pasta `backup_removed_20260222_031922/` contém uma versão antiga (HTML inline, JS próprio e script `.ps1` para iniciar via `python -m http.server`).
- `server/php/` também parece uma rota alternativa antiga.

Isso não é necessariamente problema, mas aumenta ruído e risco de confusão.

## 13) Inventário (lista completa dos arquivos analisados)

Abaixo está a lista completa de arquivos (sem `node_modules` e `.git`) detectados:

- `.env`
- `.gitignore`
- `AUDIT_REPORT.md`
- `check.js`
- `docker-compose.yml`
- `Dockerfile`
- `ngrok.exe`
- `OPERATIONS.md`
- `package-lock.json`
- `package.json`
- `README.md`
- `backup_removed_20260222_031922/index.html`
- `backup_removed_20260222_031922/iniciar-site.ps1`
- `backup_removed_20260222_031922/logo-governo-br.svg`
- `backup_removed_20260222_031922/logo-governo-federal-atual.svg`
- `backup_removed_20260222_031922/script.js`
- `backup_removed_20260222_031922/styles.css`
- `data/doacao.db`
- `public/admin.css`
- `public/admin.html`
- `public/admin.js`
- `public/index.html`
- `public/assets/images/logo-governo-federal.svg`
- `public/css/base.css`
- `public/css/main.css`
- `public/css/styles.css`
- `public/css/components/content.css`
- `public/css/components/donation.css`
- `public/css/components/footer.css`
- `public/css/components/header.css`
- `public/css/components/hero.css`
- `public/css/components/progress.css`
- `public/js/api.js`
- `public/js/app.js`
- `public/js/config.js`
- `public/js/main.js`
- `public/js/components/donation.js`
- `public/js/components/header.js`
- `public/js/components/progress.js`
- `public/js/utils/formatCurrency.js`
- `scripts/inspect-db.js`
- `server/migrations/20260222100000_add_payment_id_index.js`
- `server/migrations/20260222110000_donations_status_approved.js`
- `server/migrations/20260222_add_payment_id.js`
- `server/migrations/20260222_init.js`
- `server/node/index.js`
- `server/node/package-lock.json`
- `server/node/package.json`
- `server/node/lib/logger.js`
- `server/node/middlewares/auth.js`
- `server/node/middlewares/errorHandler.js`
- `server/node/routes/admin.js`
- `server/node/routes/payments.js`
- `server/node/routes/public.js`
- `server/php/router.php`
- `server/php/api/campaign.php`
- `server/seeds/01_campaign.js`
- `server/seeds/02_admin.js`

## 14) Próximos passos recomendados (para “estado rodável”)

- **Restaurar/criar** `server/node/db.js` (instância Knex apontando para `data/doacao.db`)
- **Adicionar** `knexfile.js` (ou ajustar scripts `knex` para usarem um arquivo de config existente)
- Decidir se `server/node/package.json` vai existir (monorepo) ou se deve ser removido para evitar conflito
- Se `backup_removed_*/` e `server/php/` não forem usados, mover para `archive/` ou remover do repositório
- Se `ngrok.exe` não for para ficar versionado, remover do repo e documentar instalação

