#!/bin/bash
# Reset and rebuild the entire backend stack with fresh secrets

set -e

echo "🔄 Resetting DealPulse Backend Stack"
echo "======================================"
echo ""

# Confirm with user
read -p "This will DELETE all data and regenerate secrets. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "1️⃣  Stopping and removing containers and volumes..."
docker compose down -v

echo ""
echo "2️⃣  Backing up existing .env files..."
if [ -f .env ]; then
    mv .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "   Backed up .env"
fi
if [ -f .env.local ]; then
    mv .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
    echo "   Backed up .env.local"
fi

echo ""
echo "3️⃣  Generating new secrets..."
./scripts/generate-secrets.sh > .env

echo ""
echo "4️⃣  Rebuilding app container..."
docker compose build --no-cache app

echo ""
echo "5️⃣  Starting all services..."
docker compose up -d

echo ""
echo "6️⃣  Waiting for database to be ready..."
sleep 10

echo ""
echo "7️⃣  Running database migrations..."
for file in supabase/migrations/*.sql; do
    echo "   Running: $(basename $file)"
    docker exec -i mna-db psql -U postgres -d postgres < "$file" > /dev/null 2>&1
done

echo ""
echo "✅ Backend reset complete!"
echo ""
echo "Services are now running:"
echo "  • App:            http://localhost:3005"
echo "  • Supabase Studio: http://localhost:54343"
echo "  • Kong API:        http://localhost:8025"
echo "  • PostgreSQL:      localhost:54342"
echo "  • Redis:           localhost:6379"
echo ""
echo "Next steps:"
echo "  1. Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env"
echo "  2. Run: docker compose restart app"
echo ""
