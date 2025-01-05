#!/bin/bash
set -e

# Wait for database to be ready
echo "Waiting for database to be ready..."
while ! nc -z db 5432; do
  sleep 0.1
done
echo "Database is ready!"

# Run migrations
echo "Running database migrations..."
bunx prisma migrate deploy

# Start the application
echo "Starting FlexiBuckets..."
exec bun ./node_modules/next/dist/bin/next start