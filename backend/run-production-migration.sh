#!/bin/bash

echo "🔧 Running production migrations..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set it to your production database connection string"
    exit 1
fi

echo "📊 Migrating: Add currency to transactions..."
node scripts/migrate-add-currency-to-transactions.js

echo "✅ All migrations completed!"
