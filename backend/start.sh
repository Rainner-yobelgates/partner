#!/bin/sh

# Export ulang buat mastiin Prisma baca
export DATABASE_URL=$DATABASE_URL

echo "--- DEBUG INFO ---"
ls -R dist
echo "------------------"

echo "Running Migrations..."
npx prisma migrate deploy

echo "Starting NestJS App..."
# Kalau di package.json masih "node dist/main", 
# kita bypass aja pake command manual biar pasti jalan:
node dist/src/main.js