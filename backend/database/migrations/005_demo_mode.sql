BEGIN;

-- ---------------------------------------------------------------------------
-- Demo / sandbox tagging.
--
-- Every row created while DEMO_MODE is enabled (seeded demo data and anything a
-- recruiter does in the sandbox) is flagged with is_demo = TRUE. This lets the
-- demo reset remove exactly the sandbox rows and re-seed the baseline without
-- ever touching real, non-demo data in the same database.
--
-- Only the "root" entities need the flag; payments, order items, status
-- history, tracking events and customer addresses are reachable through their
-- parent order/user via joins.
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.order_returns
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

-- Partial indexes keep the reset lookups cheap without bloating the indexes for
-- the common non-demo case.
CREATE INDEX IF NOT EXISTS users_is_demo_idx
  ON public.users (is_demo) WHERE is_demo;

CREATE INDEX IF NOT EXISTS categories_is_demo_idx
  ON public.categories (is_demo) WHERE is_demo;

CREATE INDEX IF NOT EXISTS products_is_demo_idx
  ON public.products (is_demo) WHERE is_demo;

CREATE INDEX IF NOT EXISTS orders_is_demo_idx
  ON public.orders (is_demo) WHERE is_demo;

CREATE INDEX IF NOT EXISTS inventory_movements_is_demo_idx
  ON public.inventory_movements (is_demo) WHERE is_demo;

COMMIT;
