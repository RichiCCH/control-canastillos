-- Migración: agregar columna activo a users
ALTER TABLE users ADD COLUMN IF NOT EXISTS activo INTEGER NOT NULL DEFAULT 1;
