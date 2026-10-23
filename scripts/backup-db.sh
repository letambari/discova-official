#!/bin/bash
# ========================================================
# Discova Africa Tech - Automated SQLite Backup Script
# ========================================================
# Run this script via cPanel Cron Jobs (e.g. daily at 2:00 AM)
# Cron Schedule: 0 2 * * * /bin/bash /home/USERNAME/public_html/scripts/backup-db.sh

set -e

# 1. Determine active database location
if [ -n "$DB_PATH" ] && [ -f "$DB_PATH" ]; then
  SOURCE_DB="$DB_PATH"
elif [ -f "$HOME/discova_data/discova.db" ]; then
  SOURCE_DB="$HOME/discova_data/discova.db"
elif [ -f "./discova.db" ]; then
  SOURCE_DB="./discova.db"
else
  echo "[BACKUP ERROR] Could not locate discova.db to backup."
  exit 1
fi

# 2. Determine backup storage directory
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
mkdir -p "$BACKUP_DIR"

# 3. Create timestamped snapshot
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/discova_${TIMESTAMP}.db"

# Copy main database and check for SQLite WAL journal
cp "$SOURCE_DB" "$BACKUP_FILE"

if [ -f "${SOURCE_DB}-wal" ]; then
  cp "${SOURCE_DB}-wal" "${BACKUP_FILE}-wal"
fi

echo "[BACKUP OK] Database safely backed up to: $BACKUP_FILE"

# 4. Retention policy: Remove backups older than 30 days to save hosting disk space
find "$BACKUP_DIR" -type f -name "discova_*.db*" -mtime +30 -delete 2>/dev/null || true
echo "[BACKUP OK] Old backups pruned (30-day retention)."
