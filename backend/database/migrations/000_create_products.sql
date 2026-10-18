BEGIN;

-- ---------------------------------------------------------------------------
-- Base product catalog.
--
-- The products table is the anchor of the storefront; every later migration
-- (002_extend_core, 005_demo_mode) alters it and references its columns.
-- It must therefore be created before those migrations run. This file sorts
-- first (000_) so a fresh database builds the catalog table first, and it is
-- written with IF NOT EXISTS so it is a no-op on databases where the table was
-- already provisioned.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    category VARCHAR(120),
    image_url TEXT,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    rating_rate NUMERIC(3,2),
    rating_count INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS products_created_at_idx
    ON public.products (created_at DESC);

COMMIT;
