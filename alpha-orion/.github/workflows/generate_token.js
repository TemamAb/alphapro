const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Default to the local dev secret if .env is missing or variable is unset
const SECRET = process.env.JWT_SECRET || 'local-dev-secret';

const generateToken = () => {
  console.log('🔐 Alpha-Orion JWT Generator');
  console.log('---------------------------');

  const payload = {
    id: 'dev-admin-001',
    username: 'admin_dev',
    role: 'admin',
    permissions: ['read', 'write', 'execute', 'admin']
  };

  const options = {
    expiresIn: '24h', // Long expiry for dev convenience
    issuer: 'alpha-orion-dev-tools'
  };

  try {
    const token = jwt.sign(payload, SECRET, options);
    console.log('✅ Token Generated Successfully:\n');
    console.log(token);
    console.log('\n⚠️  This token is valid for 24 hours. Do not use in production.');
  } catch (error) {
    console.error('❌ Error generating token:', error.message);
  }
};

generateToken();