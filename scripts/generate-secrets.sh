#!/bin/bash
# Generate cryptographically secure secrets for DealPulse

set -e

echo "🔐 Generating secure secrets for DealPulse..."
echo ""

# Generate a strong JWT secret (64 bytes = 128 hex chars)
JWT_SECRET=$(openssl rand -hex 64)
echo "✓ Generated JWT_SECRET"

# Generate a strong Postgres password (32 bytes = 64 hex chars)
POSTGRES_PASSWORD=$(openssl rand -hex 32)
echo "✓ Generated POSTGRES_PASSWORD"

# Generate token encryption key (32 bytes for AES-256)
TOKEN_ENCRYPTION_KEY=$(openssl rand -hex 32)
echo "✓ Generated TOKEN_ENCRYPTION_KEY"

# Generate JWT tokens using the new secret
# Note: We'll use Node.js with jsonwebtoken to generate proper JWTs
cat > /tmp/generate-jwt.js << 'EOF'
const crypto = require('crypto');

const secret = process.argv[2];
const role = process.argv[3];

// Header
const header = {
  alg: 'HS256',
  typ: 'JWT'
};

// Payload
const payload = {
  iss: 'supabase',
  ref: 'local',
  role: role,
  iat: Math.floor(Date.now() / 1000),
  exp: 2147483647 // Max 32-bit int (year 2038)
};

// Encode
const base64url = (str) => {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

const headerEncoded = base64url(JSON.stringify(header));
const payloadEncoded = base64url(JSON.stringify(payload));
const signature = crypto
  .createHmac('sha256', secret)
  .update(`${headerEncoded}.${payloadEncoded}`)
  .digest('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=/g, '');

console.log(`${headerEncoded}.${payloadEncoded}.${signature}`);
EOF

# Generate ANON_KEY
ANON_KEY=$(node /tmp/generate-jwt.js "$JWT_SECRET" "anon")
echo "✓ Generated ANON_KEY"

# Generate SERVICE_ROLE_KEY
SERVICE_ROLE_KEY=$(node /tmp/generate-jwt.js "$JWT_SECRET" "service_role")
echo "✓ Generated SERVICE_ROLE_KEY"

# Clean up temp file
rm /tmp/generate-jwt.js

# Output the secrets
echo ""
echo "📝 Your new secrets (save these to .env):"
echo ""
echo "# Database"
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
echo ""
echo "# JWT Configuration"
echo "JWT_SECRET=$JWT_SECRET"
echo "ANON_KEY=$ANON_KEY"
echo "SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY"
echo ""
echo "# Token Encryption (for OAuth tokens)"
echo "TOKEN_ENCRYPTION_KEY=$TOKEN_ENCRYPTION_KEY"
echo ""
echo "# Supabase Public Configuration"
echo "NEXT_PUBLIC_SUPABASE_URL=http://localhost:8025"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY"
echo ""
echo "# Internal Service Keys"
echo "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY"
echo ""
echo "# Application URL"
echo "NEXT_PUBLIC_APP_URL=http://localhost:3000"
echo ""
echo "# Google OAuth Configuration (add your credentials)"
echo "GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com"
echo "GOOGLE_CLIENT_SECRET=your-client-secret"
echo ""
echo "✅ Secrets generated successfully!"
