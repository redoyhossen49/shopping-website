# Checkout, Payments & Customer Accounts — Setup

This document explains how to configure and run the checkout, payment
(bKash / Nagad / card via SSLCOMMERZ, plus Cash on Delivery), and customer
account features.

## 1. Database migration

Apply the schema changes (addresses, payments, returns, tracking, order
columns):

```bash
cd backend
npm run migrate
```

Migration file: `backend/database/migrations/003_checkout_payments_accounts.sql`.

## 2. Backend environment

Copy `backend/.env.example` to `backend/.env` and set the values. The payment
specific ones:

| Variable | Purpose |
| --- | --- |
| `FRONTEND_URL` | Where the gateway redirects the shopper back to (e.g. `http://localhost:5173`). |
| `API_PUBLIC_URL` | Public base URL of the API used to build gateway callback URLs (e.g. `http://localhost:5000`). In production this must be reachable by SSLCOMMERZ. |
| `RETURN_WINDOW_DAYS` | Days after delivery during which a return can be requested (default `14`). |
| `SSLCOMMERZ_STORE_ID` | Merchant store id. Leave blank to keep online payments disabled. |
| `SSLCOMMERZ_STORE_PASSWORD` | Merchant store password. **Never commit real values.** |
| `SSLCOMMERZ_SANDBOX` | `true` for the sandbox gateway, `false` for production. |

> Online payments are only enabled when **both** `SSLCOMMERZ_STORE_ID` and
> `SSLCOMMERZ_STORE_PASSWORD` are set. When they are missing, the storefront
> hides online payment and keeps Cash on Delivery available. Payment success
> is never faked — it is only recorded after SSLCOMMERZ validates the
> transaction server-side.

### Getting sandbox credentials

1. Register at <https://developer.sslcommerz.com/registration/>.
2. Copy the sandbox **Store ID** and **Store Password** into `.env`.
3. Set `SSLCOMMERZ_SANDBOX=true`.

For production, use the credentials issued by SSLCOMMERZ after merchant
approval, set `SSLCOMMERZ_SANDBOX=false`, and point `API_PUBLIC_URL` and
`FRONTEND_URL` at your public HTTPS domains.

### Gateway callback URLs

These are generated automatically from `API_PUBLIC_URL`:

- `POST/GET {API_PUBLIC_URL}/api/payments/sslcommerz/success`
- `POST/GET {API_PUBLIC_URL}/api/payments/sslcommerz/fail`
- `POST/GET {API_PUBLIC_URL}/api/payments/sslcommerz/cancel`
- `POST {API_PUBLIC_URL}/api/payments/sslcommerz/ipn` (server-to-server)

The gateway POSTs to these endpoints, so the CSRF origin check exempts the
`/api/payments/sslcommerz/` prefix; these routes are authenticated by
server-side verification of the transaction instead.

## 3. Frontend environment

`src/config/app.js` reads:

- `VITE_API_URL` (defaults to the same-origin relative path `/api`, which the
  Vite dev/preview server proxies to the backend — see `VITE_API_PROXY_TARGET`)
- `VITE_CURRENCY` (defaults to `BDT`)

## 4. Running

```bash
# backend
cd backend
npm run dev

# frontend (repo root)
npm run dev
```

## 5. Feature overview

- **Guest checkout** — no account required. A high-entropy tracking token is
  shown once and stored only as a SHA-256 hash; the token is used to view the
  order at `/track-order`.
- **Customer accounts** — `/account` with overview, orders, order tracking,
  cancellation/return requests, saved addresses, and profile/password.
- **Payments** — Cash on Delivery (default) and SSLCOMMERZ (bKash, Nagad,
  card). Payment status changes are kept in sync with the `payments` table.
- **Admin** — `/admin/orders/:id` shows payments, shipment tracking, and
  returns; `/admin/returns` reviews cancellation/return requests. Approving a
  cancellation/return restocks items and refunds paid orders.

## 6. Tests

```bash
cd backend
npm test
```

Covers checkout, guests/tracking, payments, returns, addresses, and accounts.
