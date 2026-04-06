/**
 * Run once to create the first admin user:
 *   cd server && node scripts/create-admin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const db     = require('../db');

async function main() {
  const email       = process.argv[2] || 'admin@bki.com';
  const password    = process.argv[3] || 'changeme123';
  const displayName = process.argv[4] || 'Admin';

  const hash = await bcrypt.hash(password, 12);

  try {
    const [result] = await db.execute(
      'INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)',
      [email, hash, displayName, 'admin']
    );
    console.log(`✓ Admin created — id: ${result.insertId}, email: ${email}`);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.log('User already exists. Updating password...');
      await db.execute('UPDATE users SET password_hash=?, role=? WHERE email=?', [hash, 'admin', email]);
      console.log('✓ Password updated.');
    } else {
      console.error('Error:', err.message);
    }
  }

  process.exit(0);
}

main();
