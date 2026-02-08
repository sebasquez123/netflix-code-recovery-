#!/bin/sh
set -e

echo "🔄 Running database migrations..."
npx prisma migrate deploy --config prisma.config.ts

echo "✅ Migrations completed. Starting application..."
exec node dist/main.js
