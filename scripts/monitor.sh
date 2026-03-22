#!/bin/bash
# Monitoring Script

echo "📊 System Monitor - $(date)"

# Check server status
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Server: Running"
else
    echo "❌ Server: DOWN"
fi

# Check PM2 status
pm2 status estif-home

# Check memory
echo "💾 Memory Usage:"
free -h

# Check disk space
echo "💿 Disk Space:"
df -h /

# Check logs
echo "📝 Recent Errors:"
tail -n 5 logs/error.log 2>/dev/null || echo "No errors"