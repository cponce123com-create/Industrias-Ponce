# Database Migrations and Rollback Guide

This document lists all Drizzle migrations and their corresponding rollback SQL.

---

## 0001_inventory_photo_fields.sql

**Purpose**: Add `physical_count` and `photo_url` columns to `inventory_records`.

**Rollback**:
```sql
ALTER TABLE "inventory_records" DROP COLUMN IF EXISTS "physical_count";
ALTER TABLE "inventory_records" DROP COLUMN IF EXISTS "photo_url";
```

---

## 0002_warehouse_and_new_tables.sql

**Purpose**: Schema foundation — create `users`, `products`, `inventory_records`, `immobilized_products`, `samples`, `dye_lots`, `final_disposition`, `documents`, `personnel`, `epp_checklists`, `epp_deliveries`, `epp_master`, `audit_logs`, `lot_evaluations` tables. Add FK constraints and unique constraints.

**Rollback**:
```sql
-- Drop FK constraints first (in reverse dependency order)
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_user_id_users_id_fk";
ALTER TABLE "epp_deliveries" DROP CONSTRAINT IF EXISTS "epp_deliveries_delivered_by_users_id_fk";
ALTER TABLE "epp_deliveries" DROP CONSTRAINT IF EXISTS "epp_deliveries_personnel_id_epp_master_fk";
ALTER TABLE "epp_deliveries" DROP CONSTRAINT IF EXISTS "epp_deliveries_personnel_id_personnel_id_fk";
ALTER TABLE "epp_checklists" DROP CONSTRAINT IF EXISTS "epp_checklists_personnel_id_personnel_id_fk";
ALTER TABLE "epp_checklists" DROP CONSTRAINT IF EXISTS "epp_checklists_reviewed_by_users_id_fk";
ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_uploaded_by_users_id_fk";
ALTER TABLE "final_disposition" DROP CONSTRAINT IF EXISTS "final_disposition_registered_by_users_id_fk";
ALTER TABLE "final_disposition" DROP CONSTRAINT IF EXISTS "final_disposition_approved_by_users_id_fk";
ALTER TABLE "final_disposition" DROP CONSTRAINT IF EXISTS "final_disposition_product_id_products_id_fk";
ALTER TABLE "dye_lots" DROP CONSTRAINT IF EXISTS "dye_lots_registered_by_users_id_fk";
ALTER TABLE "dye_lots" DROP CONSTRAINT IF EXISTS "dye_lots_approved_by_users_id_fk";
ALTER TABLE "dye_lots" DROP CONSTRAINT IF EXISTS "dye_lots_product_id_products_id_fk";
ALTER TABLE "samples" DROP CONSTRAINT IF EXISTS "samples_taken_by_users_id_fk";
ALTER TABLE "samples" DROP CONSTRAINT IF EXISTS "samples_product_id_products_id_fk";
ALTER TABLE "immobilized_products" DROP CONSTRAINT IF EXISTS "immobilized_products_registered_by_users_id_fk";
ALTER TABLE "immobilized_products" DROP CONSTRAINT IF EXISTS "immobilized_products_released_by_users_id_fk";
ALTER TABLE "immobilized_products" DROP CONSTRAINT IF EXISTS "immobilized_products_product_id_products_id_fk";
ALTER TABLE "inventory_records" DROP CONSTRAINT IF EXISTS "inventory_records_registered_by_users_id_fk";
ALTER TABLE "inventory_records" DROP CONSTRAINT IF EXISTS "inventory_records_product_id_products_id_fk";

-- Drop all tables
DROP TABLE IF EXISTS "lot_evaluations";
DROP TABLE IF EXISTS "audit_logs";
DROP TABLE IF EXISTS "epp_master";
DROP TABLE IF EXISTS "epp_deliveries";
DROP TABLE IF EXISTS "epp_checklists";
DROP TABLE IF EXISTS "personnel";
DROP TABLE IF EXISTS "documents";
DROP TABLE IF EXISTS "final_disposition";
DROP TABLE IF EXISTS "dye_lots";
DROP TABLE IF EXISTS "samples";
DROP TABLE IF EXISTS "immobilized_products";
DROP TABLE IF EXISTS "inventory_records";
DROP TABLE IF EXISTS "products";
DROP TABLE IF EXISTS "users";
```

---

## 0003_msds_url.sql

**Purpose**: Add `msds_url` column to `products`.

**Rollback**:
```sql
ALTER TABLE products DROP COLUMN IF EXISTS msds_url;
```

---

## 0004_msds_fields.sql

**Purpose**: Add hazard-related columns to `products`: `hazard_level`, `hazard_pictograms`, `first_aid`. Also creates `revoked_tokens` table.

**Rollback**:
```sql
ALTER TABLE products DROP COLUMN IF EXISTS hazard_level;
ALTER TABLE products DROP COLUMN IF EXISTS hazard_pictograms;
ALTER TABLE products DROP COLUMN IF EXISTS first_aid;
DROP TABLE IF EXISTS revoked_tokens;
```

---

## 0005_fixes_and_revoked_tokens.sql

**Purpose**: Add `ultimo_consumo` column to `balance_records`; add `msds_url` to `products` (duplicate); add hazard columns to `products` (duplicate); create `revoked_tokens` table (duplicate — note: this migration conflicts with 0005_revoked_tokens.sql, which should be applied after).

**Rollback**:
```sql
ALTER TABLE "balance_records" DROP COLUMN IF EXISTS "ultimo_consumo";
-- The msds_url, hazard fields, and revoked_tokens columns/tables may already exist
-- from other migrations; dropping them here is idempotent-safe:
ALTER TABLE products DROP COLUMN IF EXISTS msds_url;
ALTER TABLE products DROP COLUMN IF EXISTS hazard_level;
ALTER TABLE products DROP COLUMN IF EXISTS hazard_pictograms;
ALTER TABLE products DROP COLUMN IF EXISTS first_aid;
DROP TABLE IF EXISTS revoked_tokens;
```

---

## 0005_revoked_tokens.sql

**Purpose**: Create `revoked_tokens` table (stores revoked JWT token IDs for logout/revocation).

**Rollback**:
```sql
DROP TABLE IF EXISTS "revoked_tokens";
```

---

## 0006_inventory_boxes_and_inventory_location.sql

**Purpose**: Add `location` column to `inventory_records`; create `inventory_boxes` table with FK to `inventory_records`; add indexes on `inventory_boxes`.

**Rollback**:
```sql
DROP TABLE IF EXISTS "inventory_boxes";
ALTER TABLE "inventory_records" DROP COLUMN IF EXISTS "location";
```

---

## 0007_add_perf_indexes.sql

**Purpose**: Add performance indexes on `inventory_records`, `balance_records`, `cuadre_items`, `samples`, `immobilized_products`, `epp_checklists`, `products`, `documents`, `audit_logs`, `users`.

**Rollback**:
```sql
DROP INDEX IF EXISTS "users_status_idx";
DROP INDEX IF EXISTS "audit_logs_created_at_idx";
DROP INDEX IF EXISTS "documents_status_created_at_idx";
DROP INDEX IF EXISTS "products_status_warehouse_idx";
DROP INDEX IF EXISTS "epp_checklists_personnel_id_idx";
DROP INDEX IF EXISTS "immobilized_products_status_date_idx";
DROP INDEX IF EXISTS "immobilized_products_status_idx";
DROP INDEX IF EXISTS "samples_status_date_idx";
DROP INDEX IF EXISTS "cuadre_items_code_idx";
DROP INDEX IF EXISTS "balance_records_warehouse_date_idx";
DROP INDEX IF EXISTS "balance_records_code_idx";
DROP INDEX IF EXISTS "inventory_records_product_date_idx";
DROP INDEX IF EXISTS "inventory_records_record_date_idx";
DROP INDEX IF EXISTS "inventory_records_product_id_idx";
```