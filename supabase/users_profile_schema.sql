-- Agregar campos de perfil a la tabla users
-- Ejecuta este script en Supabase SQL Editor para agregar los campos de perfil

-- Agregar columnas de perfil si no existen
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_picture TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS reset_token TEXT,
ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP WITH TIME ZONE;

-- Crear índice para reset_token para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token) WHERE reset_token IS NOT NULL;

-- Comentarios para documentación
COMMENT ON COLUMN users.profile_picture IS 'URL o path de la foto de perfil del usuario';
COMMENT ON COLUMN users.email IS 'Email de contacto del usuario';
COMMENT ON COLUMN users.phone IS 'Teléfono de contacto del usuario';
COMMENT ON COLUMN users.reset_token IS 'Token temporal para reset de contraseña';
COMMENT ON COLUMN users.reset_token_expires IS 'Fecha de expiración del token de reset';

