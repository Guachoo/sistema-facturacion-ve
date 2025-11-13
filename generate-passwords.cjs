const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate password hashes for test users
const users = [
  { email: 'admin@sistema.com', password: 'admin123' },
  { email: 'contador@sistema.com', password: 'contador123' },
  { email: 'vendedor@sistema.com', password: 'vendedor123' }
];

console.log('-- SQL script to update users with password hashes');
console.log('-- Generated passwords:');
users.forEach(user => {
  console.log(`-- ${user.email}: ${user.password}`);
});
console.log('');

users.forEach(user => {
  const hash = hashPassword(user.password);
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = '${user.email}';`);
});

console.log('');
console.log('-- Verify users can login');
console.log('SELECT email, nombre, rol, password_hash IS NOT NULL as has_password FROM users;');