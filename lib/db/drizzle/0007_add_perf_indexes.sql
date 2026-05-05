-- 0007_add_perf_indexes.sql
-- Priority: CRITICAL — resolves sequential scans on the most heavily-used table
-- in the system (inventory_records), plus indexes for all hot-path queries.

BEGIN;

-- ── inventory_records — most-writes and most-reads table ─────────────────────
-- FK product_id: used in every inventory list, report, and cuadre query.
CREATE INDEX IF NOT EXISTS "inventory_records_product_id_idx"
  ON "inventory_records" ("product_id");

-- ORDER BY record_date DESC: used in "último consumo" queries across reports,
-- cuadre, and inventory list — without this, every MAX() does a full scan.
CREATE INDEX IF NOT EXISTS "inventory_records_record_date_idx"
  ON "inventory_records" ("record_date" DESC);

-- Composite: covers queries that filter by product AND sort by date in a single
-- index traversal (e.g. reports with WHERE product_id = $1 ORDER BY record_date).
CREATE INDEX IF NOT EXISTS "inventory_records_product_date_idx"
  ON "inventory_records" ("product_id", "record_date" DESC);

-- ── balance_records — cuadre's primary lookup table ─────────────────────────
-- WHERE code = ANY($codes) in both ERP and System last-consumption queries.
CREATE INDEX IF NOT EXISTS "balance_records_code_idx"
  ON "balance_records" ("code");

-- Composite for filtered queries (by warehouse + date range).
CREATE INDEX IF NOT EXISTS "balance_records_warehouse_date_idx"
  ON "balance_records" ("warehouse", "balance_date" DESC);

-- ── cuadre_items — join key in cuadre.ts queries ────────────────────────────
CREATE INDEX IF NOT EXISTS "cuadre_items_code_idx"
  ON "cuadre_items" ("code");

-- ── samples ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "samples_status_date_idx"
  ON "samples" ("status", "sample_date" DESC);

-- ── immobilized_products ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "immobilized_products_status_idx"
  ON "immobilized_products" ("status");
CREATE INDEX IF NOT EXISTS "immobilized_products_status_date_idx"
  ON "immobilized_products" ("status", "immobilized_date" DESC);

-- ── epp_checklists ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "epp_checklists_personnel_id_idx"
  ON "epp_checklists" ("personnel_id");

-- ── products ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "products_status_warehouse_idx"
  ON "products" ("status", "warehouse");

-- ── documents ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "documents_status_created_at_idx"
  ON "documents" ("status", "created_at" DESC);

-- ── audit_logs ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx"
  ON "audit_logs" ("created_at" DESC);

-- ── users ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "users_status_idx"
  ON "users" ("status");

COMMIT;