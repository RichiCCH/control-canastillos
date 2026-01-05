-- Migration: Add 'anulado' state and 'transportado_por' field
-- Date: 2026-01-05

-- Step 1: Add 'anulado' to the estado_movimiento enum
ALTER TYPE estado_movimiento ADD VALUE IF NOT EXISTS 'anulado';

-- Step 2: Add 'transportado_por' column to movimientos table
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS transportado_por VARCHAR(255);

-- Verification queries (run these to verify the changes)
-- SELECT enum_range(NULL::estado_movimiento);
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'movimientos' AND column_name = 'transportado_por';
