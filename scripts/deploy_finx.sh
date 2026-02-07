#!/bin/bash

# Finx.win Deployment Script
# Targets: 148.251.6.248 (Hetzner NVMe)

SERVER_IP="91.99.186.43"
SERVER_PORT="22"
SERVER_USER="root"
REMOTE_PATH="/data/projects/finx.win/"

echo "🚀 Starting deployment to finx.win..."

# 0. Load Environment Variables (for DB_USER)
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# 1. Create Full Backup
echo "📦 Creating Full Database Backup..."
ssh -p $SERVER_PORT -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP \
    "cd $REMOTE_PATH && \
     timestamp=\$(date +%F_%H-%M-%S) && \
     echo 'Backing up database...' && \
     docker exec finx-postgres pg_dumpall -c -U \${DB_USER:-finx_admin} > db_backup_\$timestamp.sql && \
     gzip db_backup_\$timestamp.sql && \
     echo '✅ Database backup saved: db_backup_\$timestamp.sql.gz'"

if [ $? -ne 0 ]; then
    echo "⚠️ Backup failed! Continuing with caution..."
    # exit 1  <-- Uncomment to enforce backup success
fi

# 2. Sync Files
echo "📂 Syncing files..."
rsync -avz --delete -e "ssh -p $SERVER_PORT -o StrictHostKeyChecking=no" \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    --exclude '.DS_Store' \
    --exclude 'db_data' \
    --exclude '.env' \
    --exclude '.brain' \
    --exclude '.agent' \
    ./ $SERVER_USER@$SERVER_IP:$REMOTE_PATH

if [ $? -ne 0 ]; then
    echo "❌ Rsync failed. Aborting."
    exit 1
fi
echo "✅ Files synced."

# 2. Rebuild and Restart Docker Service
echo "🐳 Rebuilding and restarting finx-app container on server..."
ssh -p $SERVER_PORT -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP \
    "cd $REMOTE_PATH && docker compose -f docker-compose.prod.yml up -d --build --force-recreate finx-app"

if [ $? -ne 0 ]; then
    echo "❌ Remote Docker command failed."
    exit 1
fi

echo "✅ Deployment successful! finx.win should be updated."
