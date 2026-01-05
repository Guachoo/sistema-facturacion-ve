-- =====================================================
-- MIGRACIÓN: Sistema de Usuarios y Roles
-- =====================================================
-- Esta migración agrega la tabla de usuarios con roles:
-- - administrador
-- - vendedor
-- - promotor
-- - contador

-- Crear tabla de usuarios si no existe
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('administrador', 'vendedor', 'promotor', 'contador')),
  activo BOOLEAN DEFAULT true,
  ultimo_acceso TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_rol ON users(rol);
CREATE INDEX IF NOT EXISTS idx_users_activo ON users(activo);

-- Insertar usuarios de prueba (solo si no existen)
INSERT INTO users (nombre, email, password_hash, rol)
SELECT 'Administrador', 'admin@axiona.com', '$2a$10$dummyhash', 'administrador'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@axiona.com');

INSERT INTO users (nombre, email, password_hash, rol)
SELECT 'Vendedor Demo', 'vendedor@axiona.com', '$2a$10$dummyhash', 'vendedor'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'vendedor@axiona.com');

INSERT INTO users (nombre, email, password_hash, rol)
SELECT 'Promotor Demo', 'promotor@axiona.com', '$2a$10$dummyhash', 'promotor'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'promotor@axiona.com');

INSERT INTO users (nombre, email, password_hash, rol)
SELECT 'Contador Demo', 'contador@axiona.com', '$2a$10$dummyhash', 'contador'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'contador@axiona.com');

-- Comentarios para documentación
COMMENT ON TABLE users IS 'Usuarios del sistema de facturación';
COMMENT ON COLUMN users.rol IS 'Rol del usuario: administrador, vendedor, promotor, contador';
COMMENT ON COLUMN users.activo IS 'Indica si el usuario está activo en el sistema';
COMMENT ON COLUMN users.ultimo_acceso IS 'Fecha y hora del último acceso del usuario';
