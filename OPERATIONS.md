# OPERATIONS - Doe por Eles

Passo a passo operacional para administrar o sistema.

## 1. Restaurar o banco de dados

**Backup (PowerShell):**
```powershell
sqlite3 data/doacao.db .dump > backup.sql
```

**Restore:**
```powershell
Remove-Item -Force data/doacao.db -ErrorAction SilentlyContinue
Get-Content backup.sql | sqlite3 data/doacao.db
```

## 2. Rodar migrations

```powershell
npx knex migrate:latest
```

Reverter: `npx knex migrate:rollback`

## 3. Criar admin (seed)

```powershell
npx knex seed:run
```

Admin padrao: admin@doeporeles.local / ChangeMe123! - Troque em producao.

## 4. Rotina de backup

Backup manual:
```powershell
sqlite3 data/doacao.db .dump > backup_$(Get-Date -Format 'yyyyMMdd').sql
```

## 5. Reset completo do banco

```powershell
Remove-Item -Force data/doacao.db -ErrorAction SilentlyContinue
npx knex migrate:latest
npx knex seed:run
```

## 6. Variaveis de ambiente em producao

- NODE_ENV=production
- JWT_SECRET (chave forte)
- MERCADO_PAGO_ACCESS_TOKEN
- BASE_URL (HTTPS)
- WEBHOOK_DEBUG=false
- PAYMENT_DEBUG=false
