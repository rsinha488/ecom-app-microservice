#!/bin/bash

# ============================================
# LaunchpadMERN Cleanup Script
# Removes unused files, backups, and build artifacts
# ============================================

echo "🧹 Starting cleanup process..."
echo "================================"

# Track what we remove
REMOVED_COUNT=0

# ============================================
# 1. Remove backup files
# ============================================
echo ""
echo "📦 Removing backup files..."

if [ -f "services/auth/controllers/authController-backup.js" ]; then
    rm "services/auth/controllers/authController-backup.js"
    echo "  ✓ Removed authController-backup.js"
    ((REMOVED_COUNT++))
fi

if [ -f "services/auth/utils/jwt-backup.js" ]; then
    rm "services/auth/utils/jwt-backup.js"
    echo "  ✓ Removed jwt-backup.js"
    ((REMOVED_COUNT++))
fi

# Remove any other backup files
find . -type f \( -name "*.bak" -o -name "*.backup" -o -name "*-backup.*" \) -not -path "*/node_modules/*" -not -path "*/.next/*" -delete 2>/dev/null
if [ $? -eq 0 ]; then
    echo "  ✓ Removed other backup files"
fi

# ============================================
# 2. Clean Next.js build cache (safe - will rebuild)
# ============================================
echo ""
echo "🏗️  Cleaning Next.js build cache..."

if [ -d "frontend/.next" ]; then
    # Keep .next folder but clean cache
    rm -rf frontend/.next/cache/*.old 2>/dev/null
    echo "  ✓ Cleaned Next.js cache (.old files)"
    ((REMOVED_COUNT++))
fi

# ============================================
# 3. Remove temporary files
# ============================================
echo ""
echo "🗑️  Removing temporary files..."

# Remove vim swap files
find . -type f \( -name "*.swp" -o -name "*.swo" -o -name "*~" \) -not -path "*/node_modules/*" -delete 2>/dev/null
if [ $? -eq 0 ]; then
    echo "  ✓ Removed editor temporary files"
fi

# Remove macOS files
find . -type f -name ".DS_Store" -delete 2>/dev/null
if [ $? -eq 0 ]; then
    echo "  ✓ Removed .DS_Store files"
fi

# ============================================
# 4. Clean log files (keep directories)
# ============================================
echo ""
echo "📝 Cleaning old log files..."

if [ -d "services/logs" ]; then
    # Keep recent logs, remove old ones (older than 7 days)
    find services/logs -name "*.log" -type f -mtime +7 -delete 2>/dev/null
    echo "  ✓ Removed logs older than 7 days"
fi

if [ -d "api-gateway/logs" ]; then
    find api-gateway/logs -name "*.log" -type f -mtime +7 -delete 2>/dev/null
    echo "  ✓ Removed gateway logs older than 7 days"
fi

# ============================================
# 5. Optional: Clean all node_modules (uncomment to use)
# ============================================
echo ""
echo "📦 Node modules status:"
echo "  ℹ️  To clean node_modules, run: npm run clean:all"
echo "  ℹ️  This is not done automatically to avoid breaking development"

# ============================================
# Summary
# ============================================
echo ""
echo "================================"
echo "✅ Cleanup complete!"
echo "   Files/folders cleaned: $REMOVED_COUNT+"
echo ""
echo "Additional cleanup options:"
echo "  • Remove node_modules: npm run clean:all"
echo "  • Clear npm cache: npm cache clean --force"
echo "  • Rebuild frontend: cd frontend && rm -rf .next && npm run build"
echo ""
echo "💡 Tip: All cleaned items are in .gitignore and won't be committed"
echo "================================"
