BEGIN;

-- ---------------------------------------------------------------------------
-- Customer profile extension
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(40);

-- ---------------------------------------------------------------------------
-- Orders: payment method, fulfilment tracking and guest access
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) NOT NULL DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS payment_channel VARCHAR(20),
  ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(80),
  ADD COLUMN IF NOT EXISTS carrier VARCHAR(80),
  ADD COLUMN IF NOT EXISTS tracking_url TEXT,
  ADD COLUMN IF NOT EXISTS guest_token_hash VARCHAR(128),
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Expand the order status lifecycle to cover return workflow states. The
-- original constraint was declared inline in 002, so Postgres named it
-- "orders_status_check".
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending','processing','shipped','delivered','cancelled',
    'return_requested','returned'
  ));

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS orders_tracking_number_idx ON public.orders(tracking_number);

-- ---------------------------------------------------------------------------
-- Saved delivery addresses (registered customers)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label VARCHAR(60) NOT NULL DEFAULT 'Home',
  recipient_name VARCHAR(120) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  address_line1 VARCHAR(250) NOT NULL,
  address_line2 VARCHAR(250),
  city VARCHAR(120) NOT NULL,
  state VARCHAR(120),
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(120) NOT NULL DEFAULT 'Bangladesh',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_addresses_user_id_idx
  ON public.customer_addresses(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS customer_addresses_one_default_idx
  ON public.customer_addresses(user_id) WHERE is_default;

-- ---------------------------------------------------------------------------
-- Payment attempts (SSLCOMMERZ gateway + cash on delivery)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider VARCHAR(30) NOT NULL,
  channel VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'initiated'
    CHECK (status IN ('initiated','pending','paid','failed','cancelled','refunded')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
  provider_tran_id VARCHAR(80) NOT NULL UNIQUE,
  val_id VARCHAR(80),
  bank_tran_id VARCHAR(80),
  card_type VARCHAR(60),
  store_amount NUMERIC(12,2),
  failure_reason TEXT,
  raw_response JSONB,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payments_order_id_idx ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments(status);

-- ---------------------------------------------------------------------------
-- Cancellation / return requests
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_returns (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('cancellation','return')),
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','approved','rejected','completed')),
  admin_note TEXT,
  resolved_by BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_returns_order_id_idx ON public.order_returns(order_id);
CREATE INDEX IF NOT EXISTS order_returns_status_idx ON public.order_returns(status);
CREATE UNIQUE INDEX IF NOT EXISTS order_returns_one_open_idx
  ON public.order_returns(order_id) WHERE status IN ('requested','approved');

-- ---------------------------------------------------------------------------
-- Shipment tracking timeline
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_tracking_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status VARCHAR(40),
  message TEXT NOT NULL,
  location VARCHAR(160),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_tracking_events_order_id_idx
  ON public.order_tracking_events(order_id, occurred_at ASC);

COMMIT;
