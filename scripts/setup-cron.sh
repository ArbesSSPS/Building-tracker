#!/bin/bash

# Setup script for weekly cleaning reminders cron job
# This script sets up a cron job to run every Sunday at 18:00 Prague time

echo "Setting up weekly cleaning reminders cron job..."

# Get the current directory (where the script is located)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Project directory: $PROJECT_DIR"

# Create the cron job entry
CRON_ENTRY="0 18 * * 0 cd $PROJECT_DIR && node scripts/send-weekly-reminders.js >> logs/cron.log 2>&1"

echo "Cron entry: $CRON_ENTRY"

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_DIR/logs"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "send-weekly-reminders.js"; then
    echo "Cron job already exists. Updating..."
    # Remove existing entry and add new one
    (crontab -l 2>/dev/null | grep -v "send-weekly-reminders.js"; echo "$CRON_ENTRY") | crontab -
else
    echo "Adding new cron job..."
    # Add new entry
    (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
fi

echo "✅ Cron job set up successfully!"
echo ""
echo "The cron job will run every Sunday at 18:00 Prague time."
echo "Logs will be saved to: $PROJECT_DIR/logs/cron.log"
echo ""
echo "To view current cron jobs: crontab -l"
echo "To remove the cron job: crontab -e (then delete the line)"
echo ""
echo "To test the script manually:"
echo "  cd $PROJECT_DIR"
echo "  node scripts/send-weekly-reminders.js"
