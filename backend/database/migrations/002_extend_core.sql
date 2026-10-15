BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS sku VARCHAR(80),
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 5;

CREATE TABLE IF NOT EXISTS public.categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(160) NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT categories_slug_unique UNIQUE (slug)
);

CREATE UNIQUE INDEX IF NOT EXISTS categories_name_lower_unique
  ON public.categories (LOWER(name));

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_category_id_idx ON public.products(category_id);
CREATE INDEX IF NOT EXISTS products_is_published_idx ON public.products(is_published);
CREATE INDEX IF NOT EXISTS products_stock_idx ON public.products(stock);
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON public.products(sku) WHERE sku IS NOT NULL;

INSERT INTO public.categories (name, slug)
SELECT DISTINCT
  TRIM(product.category),
  lower(replace(replace(TRIM(product.category), ' ', '-'), '''', ''))
FROM public.products product
LEFT JOIN public.categories c ON LOWER(c.name) = LOWER(TRIM(product.category))
WHERE product.category IS NOT NULL
  AND TRIM(product.category) <> ''
  AND c.id IS NULL
ON CONFLICT (slug) DO NOTHING;

UPDATE public.products p
SET category_id = c.id, category = c.name
FROM public.categories c
WHERE p.category_id IS NULL
  AND p.category IS NOT NULL
  AND LOWER(TRIM(p.category)) = LOWER(c.name);

CREATE TABLE IF NOT EXISTS public.orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_email VARCHAR(254) NOT NULL,
  customer_phone VARCHAR(40) NOT NULL,
  shipping_address VARCHAR(250) NOT NULL,
  shipping_city VARCHAR(120) NOT NULL,
  shipping_country VARCHAR(120) NOT NULL,
  shipping_postal_code VARCHAR(20) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
  shipping_fee NUMERIC(12,2) NOT NULL CHECK (shipping_fee >= 0),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','paid','refunded','failed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  product_id BIGINT REFERENCES public.products(id) ON DELETE SET NULL,
  product_title VARCHAR(200) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total NUMERIC(12,2) NOT NULL CHECK (line_total >= 0)
);

CREATE TABLE IF NOT EXISTS public.order_status_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status VARCHAR(40) NOT NULL,
  previous_status VARCHAR(40),
  admin_user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
CREATE INDEX IF NOT EXISTS orders_payment_status_idx ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items(order_id);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  change INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reason VARCHAR(50) NOT NULL,
  note TEXT,
  admin_user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_movements_product_id_created_at_idx
  ON public.inventory_movements(product_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.store_settings (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  store_name VARCHAR(120) NOT NULL DEFAULT 'NovaShop',
  currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
  support_email VARCHAR(254),
  default_low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  default_shipping_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
