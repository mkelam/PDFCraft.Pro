#!/bin/bash

# pdflab.pro Production Monitoring Setup
# This script sets up monitoring, logging, and alerting for the production environment

set -e

echo "🔍 Setting up production monitoring for pdflab.pro..."

# Create monitoring directories
sudo mkdir -p /var/log/pdflab /var/www/pdflab/monitoring

# Install PM2 monitoring tools
echo "📊 Installing PM2 monitoring..."
sudo npm install -g pm2 pm2-logrotate

# Configure log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

# Set up system monitoring with PM2
echo "⚡ Configuring PM2 monitoring..."
pm2 install pm2-server-monit

# Create log monitoring script
cat > /var/www/pdflab/monitoring/log-monitor.sh << 'EOF'
#!/bin/bash

# Monitor application logs for errors and send alerts
LOG_FILE="/var/log/pdflab/error.log"
ALERT_EMAIL="admin@pdflab.pro"
LAST_CHECK_FILE="/tmp/last-log-check"

if [[ ! -f "$LAST_CHECK_FILE" ]]; then
    touch "$LAST_CHECK_FILE"
fi

# Get new error entries since last check
NEW_ERRORS=$(find "$LOG_FILE" -newer "$LAST_CHECK_FILE" 2>/dev/null | wc -l)

if [[ $NEW_ERRORS -gt 0 ]]; then
    echo "⚠️ Found $NEW_ERRORS new errors in application logs"

    # Send email alert (requires mailutils to be installed)
    if command -v mail &> /dev/null; then
        tail -n 50 "$LOG_FILE" | mail -s "pdflab.pro Error Alert" "$ALERT_EMAIL"
    fi

    # Update last check timestamp
    touch "$LAST_CHECK_FILE"
fi
EOF

chmod +x /var/www/pdflab/monitoring/log-monitor.sh

# Create system resource monitoring
cat > /var/www/pdflab/monitoring/resource-monitor.sh << 'EOF'
#!/bin/bash

# Monitor system resources and alert if thresholds are exceeded
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90
CPU_THRESHOLD=80

# Check memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [[ $MEMORY_USAGE -gt $MEMORY_THRESHOLD ]]; then
    echo "⚠️ High memory usage: ${MEMORY_USAGE}%"
    pm2 restart pdflab-api
fi

# Check disk usage
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [[ $DISK_USAGE -gt $DISK_THRESHOLD ]]; then
    echo "⚠️ High disk usage: ${DISK_USAGE}%"
    # Cleanup old files
    find /var/www/pdflab/uploads -type f -mtime +1 -delete
    find /var/www/pdflab/temp -type f -mtime +1 -delete
fi

# Check CPU usage (5-minute average)
CPU_USAGE=$(uptime | awk -F'load average:' '{ print $2 }' | cut -d, -f1 | xargs)
CPU_CORES=$(nproc)
CPU_PERCENTAGE=$(echo "$CPU_USAGE * 100 / $CPU_CORES" | bc -l | cut -d. -f1)

if [[ $CPU_PERCENTAGE -gt $CPU_THRESHOLD ]]; then
    echo "⚠️ High CPU usage: ${CPU_PERCENTAGE}%"
fi

echo "📊 Resource usage - Memory: ${MEMORY_USAGE}%, Disk: ${DISK_USAGE}%, CPU: ${CPU_PERCENTAGE}%"
EOF

chmod +x /var/www/pdflab/monitoring/resource-monitor.sh

# Set up crontab for monitoring
echo "⏰ Setting up monitoring cron jobs..."
(crontab -l 2>/dev/null; echo "*/5 * * * * /var/www/pdflab/monitoring/resource-monitor.sh >> /var/log/pdflab/monitoring.log 2>&1") | crontab -
(crontab -l 2>/dev/null; echo "*/10 * * * * /var/www/pdflab/monitoring/log-monitor.sh >> /var/log/pdflab/monitoring.log 2>&1") | crontab -

# Install basic monitoring tools
echo "🛠️  Installing monitoring tools..."
sudo apt-get update
sudo apt-get install -y htop iotop netstat-nat curl jq bc

# Optional: Install Netdata for real-time monitoring
read -p "🔍 Install Netdata for real-time monitoring? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📈 Installing Netdata..."
    bash <(curl -Ss https://my-netdata.io/kickstart.sh) --dont-wait --disable-telemetry
    echo "✅ Netdata installed. Access at http://your-server-ip:19999"
fi

# Create monitoring dashboard script
cat > /var/www/pdflab/monitoring/dashboard.sh << 'EOF'
#!/bin/bash

# Simple monitoring dashboard
clear
echo "==================== pdflab.pro Monitoring Dashboard ===================="
echo "🕒 Current Time: $(date)"
echo "⏱️  Server Uptime: $(uptime -p)"
echo ""

echo "📊 System Resources:"
echo "Memory: $(free -h | grep Mem | awk '{printf "Used: %s / %s (%.1f%%)", $3, $2, $3/$2*100}')"
echo "Disk:   $(df -h / | tail -1 | awk '{printf "Used: %s / %s (%s)", $3, $2, $5}')"
echo "CPU:    $(cat /proc/loadavg | awk '{printf "Load: %s %s %s", $1, $2, $3}')"
echo ""

echo "🚀 PM2 Process Status:"
pm2 jlist | jq -r '.[] | "\(.name): \(.pm2_env.status) (CPU: \(.monit.cpu)%, Memory: \(.monit.memory / 1024 / 1024 | floor)MB)"'
echo ""

echo "📈 Queue Statistics:"
QUEUE_STATS=$(curl -s http://localhost:3001/health | jq -r '.queue // "N/A"')
echo "Queue: $QUEUE_STATS"
echo ""

echo "🌐 Recent API Activity (last 10 requests):"
tail -n 10 /var/log/pdflab/combined.log | jq -r '.timestamp + " " + .method + " " + .url + " " + (.status|tostring) + " " + .duration'

echo "==================== End Dashboard ===================="
EOF

chmod +x /var/www/pdflab/monitoring/dashboard.sh

echo "✅ Monitoring setup completed!"
echo ""
echo "📋 Monitoring Commands:"
echo "   • View dashboard: /var/www/pdflab/monitoring/dashboard.sh"
echo "   • Check resources: /var/www/pdflab/monitoring/resource-monitor.sh"
echo "   • View logs: tail -f /var/log/pdflab/combined.log"
echo "   • PM2 monitoring: pm2 monit"
echo "   • System stats: htop"