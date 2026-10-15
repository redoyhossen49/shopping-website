BEGIN;

-- Composite indexes for the list/detail queries that filter on a foreign key
-- or status and then order by created_at. These remove the sort step from the
-- customer order history, admin order filters and customer listing.

CREATE INDEX IF NOT EXISTS orders_user_id_created_at_idx
  ON public.orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_status_created_at_idx
  ON public.orders (status, created_at DESC);

-- Supports the "is this product referenced by an order?" check on delete and
-- the analytics joins over order_items.
CREATE INDEX IF NOT EXISTS order_items_product_id_idx
  ON public.order_items (product_id);

-- Order detail previously read order_status_history with no supporting index.
CREATE INDEX IF NOT EXISTS order_status_history_order_id_created_at_idx
  ON public.order_status_history (order_id, created_at DESC);

-- Customer admin listing filters by role and orders by created_at.
CREATE INDEX IF NOT EXISTS users_role_created_at_idx
  ON public.users (role, created_at DESC);

COMMIT;
