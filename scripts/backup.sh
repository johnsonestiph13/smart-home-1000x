#!/bin/bash
# Backup Script

BACKUP_DIR="database/backups"
DATE=$(date +%Y%m%d_%H%M%S)

echo "📦 Creating backup: $DATE"

# Backup MongoDB
mongodump --out "$BACKUP_DIR/mongodb_$DATE"

# Backup device states
cp server/data/device_states.json "$BACKUP_DIR/device_states_$DATE.json"

# Compress
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" "$BACKUP_DIR/mongodb_$DATE"

# Clean old backups (keep last 7)
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete

echo "✅ Backup complete: backup_$DATE.tar.gz"