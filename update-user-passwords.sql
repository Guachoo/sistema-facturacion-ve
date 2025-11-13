-- Update users with password hashes for testing
-- Passwords:
-- admin@sistema.com: admin123
-- contador@sistema.com: contador123
-- vendedor@sistema.com: vendedor123

UPDATE users SET password_hash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9' WHERE email = 'admin@sistema.com';
UPDATE users SET password_hash = '7d0fa94701416c46f0833330336f33071f32191a67d4c50257ee022dc05d4815' WHERE email = 'contador@sistema.com';
UPDATE users SET password_hash = '56976bf24998ca63e35fe4f1e2469b5751d1856003e8d16fef0aafef496ed044' WHERE email = 'vendedor@sistema.com';

-- Verify all users have passwords
SELECT email, nombre, rol, password_hash IS NOT NULL as has_password FROM users;