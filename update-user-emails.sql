-- Ejemplo: Actualizar emails de usuarios existentes
-- Ajusta estos comandos según tus usuarios reales

UPDATE users SET email = 'admin@example.com' WHERE nombre = 'Admin' OR rol = 'admin';
UPDATE users SET email = 'supervisor@example.com' WHERE nombre LIKE '%Supervisor%' OR rol = 'supervisor';
UPDATE users SET email = 'operador@example.com' WHERE nombre LIKE '%Operador%' OR rol = 'operador';

-- Si conoces los IDs específicos:
-- UPDATE users SET email = 'ricardo@example.com' WHERE id = 1;
-- UPDATE users SET email = 'juan@example.com' WHERE id = 2;
