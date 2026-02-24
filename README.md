# Doe por Eles

Landing page institucional para campanha de doação em apoio a animais em situação de rua.

## Como iniciar o projeto

```bash
npm install
npm start
```

O site ficará disponível em **http://localhost:8080**.

## Estrutura do projeto

```
/public
  /css/styles.css      — Estilos principais
  /js/main.js          — Script da landing (doação, progresso, menu)
  /assets/images/      — Logos e imagens oficiais
  index.html           — Página principal
/server/node/          — Servidor estático + API simulada
package.json           — Scripts e metadados
README.md              — Este arquivo
```

## Arquivos oficiais

- **Logo Governo Federal:** Coloque em `public/assets/images/logo-governo-federal.svg`
- Use apenas versões oficiais da identidade visual do Governo Federal.

## API

- `GET /api/campaign` — Retorna metas e valor arrecadado
- `POST /api/payments/create` — Cria checkout Mercado Pago (cartão/boleto, body: `{ amount, description }`)
- `POST /api/payments/create-pix` — Cria pagamento PIX e retorna QR code (body: `{ amount }` em centavos, `payer?: { email?, first_name? }`)
- `GET /api/payments/status?payment_id=...` — Consulta status do pagamento (pending/approved/rejected)
- `POST /api/payments/webhook` — Webhook de confirmação do Mercado Pago

## Mercado Pago

1. Crie uma aplicação em [Suas Integrações](https://www.mercadopago.com.br/developers/panel/app)
2. Use credenciais de **teste** (sandbox) para desenvolvimento
3. Configure em `.env` (sem aspas, sem espaços extras):
   - `MERCADO_PAGO_ACCESS_TOKEN` — Token de acesso (use credenciais de teste para sandbox)
   - `MERCADO_PAGO_PUBLIC_KEY` — Chave pública
   - `MERCADO_PAGO_WEBHOOK_SECRET` — Chave secreta para validar assinatura do webhook (obrigatória em produção; em dev sem secret, use `WEBHOOK_DEBUG=true`)
   - `BASE_URL` — URL base. **Importante:** Para PIX e webhook, a URL **deve ser HTTPS**. O Mercado Pago pode bloquear HTTP em `back_urls` e `notification_url`. Para teste local, use ngrok: `BASE_URL=https://xxx.ngrok.io`
4. Em produção, configure o webhook na aplicação MP:
   - URL: `https://seu-dominio.com/api/payments/webhook`
5. Para teste local com ngrok:
   - Execute `ngrok http 8080`
   - Use a URL gerada: `https://xxx.ngrok.io` como BASE_URL
   - Configure no painel Mercado Pago: `https://xxx.ngrok.io/api/payments/webhook`
   - Defina `WEBHOOK_DEBUG=true` e `PAYMENT_DEBUG=true` no .env para logs no console

### Pagamento PIX (QR)

O PIX usa a API v1 de pagamentos do Mercado Pago e exige:

- **BASE_URL em HTTPS** — Use ngrok para desenvolvimento: `ngrok http 8080` e defina `BASE_URL=https://xxx.ngrok.io`
- **Chave Pix habilitada** — A conta Mercado Pago deve ter chave Pix registrada no painel (necessário para receber pagamentos PIX)

**Exemplo de request (create-pix):**
```json
{
  "amount": 1000,
  "payer": { "email": "doador@email.com" }
}
```
`amount` em centavos (ex: 1000 = R$ 10,00). Resposta inclui `payment_id`, `qr_code`, `qr_code_base64`, `ticket_url`, `expires_at`.

**Teste com curl (após ngrok ativo):**
```bash
curl -X POST https://SEU-NGROK.ngrok.io/api/payments/create-pix \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000}'
```

**Fluxo:** O usuário clica em "Pagar com Pix", recebe o QR no modal, paga no app do banco. O webhook notifica quando o pagamento é aprovado e atualiza `donations.status` para `confirmed`.

#### Instruções de teste (ngrok + sandbox)

1. **Inicie o servidor:** `npm start`
2. **Exponha com ngrok:** `ngrok http 8080` → copie a URL HTTPS (ex: `https://abc123.ngrok.io`)
3. **Configure o .env:**
   ```
   BASE_URL=https://abc123.ngrok.io
   MERCADO_PAGO_ACCESS_TOKEN=APP_USR_xxxx  (credenciais de teste)
   PAYMENT_DEBUG=true
   ```
4. **Configure o webhook no painel MP:** URL = `https://abc123.ngrok.io/api/payments/webhook`
5. **Acesse o site** pela URL do ngrok (não localhost, para o PIX funcionar)
6. **Teste o fluxo:** escolha um valor → "Pagar com Pix" → modal com QR → copie código ou abra no app
7. **Simule pagamento sandbox:** use o `ticket_url` ou escaneie o QR com app de teste do MP
8. **Verifique:** botão "Já paguei — verificar status" atualiza a barra; o webhook atualiza `campaign.collected`

### Erro "UNAUTHORIZED" ao criar preferência

- **Token inválido:** Use credenciais de **teste** em [Suas Integrações](https://www.mercadopago.com.br/developers/panel/app) → Credenciais de teste
- **Espaços/aspas:** No `.env`, não use aspas nem espaços: `MERCADO_PAGO_ACCESS_TOKEN=APP_USR_xxx`
- **Token de produção:** Em sandbox, use apenas o Access Token de teste
- **Teste rápido:** `curl -X POST https://api.mercadopago.com/checkout/preferences -H "Authorization: Bearer SEU_TOKEN" -H "Content-Type: application/json" -d '{"items":[{"title":"Doação","quantity":1,"unit_price":10}]}'`

## Tecnologias

- Node.js (servidor estático)
- HTML, CSS, JavaScript vanilla
