# Cleanup Guide

## What Was Cleaned

✅ **Backup Files Removed:**
- `services/auth/controllers/authController-backup.js`
- `services/auth/utils/jwt-backup.js`

✅ **Temporary Files Cleaned:**
- Next.js cache `.old` files
- Editor swap files (`.swp`, `.swo`, `*~`)
- macOS `.DS_Store` files

✅ **Old Log Files:**
- Logs older than 7 days from `services/logs/`
- Old gateway logs from `api-gateway/logs/`

## Files That Were Removed

### Backup Files (No longer needed)
These were created during development and are no longer necessary:
- **authController-backup.js** - Old version of auth controller (current version is working)
- **jwt-backup.js** - Old JWT manager backup (current version is working)

### Build Artifacts
- **Next.js cache .old files** - Webpack cache backups (automatically regenerated)

## Regular Cleanup Commands

### Quick Cleanup (Run anytime)
```bash
./cleanup.sh
```

This removes:
- Backup files (`.bak`, `*-backup.*`)
- Temporary editor files
- Old cache files
- Logs older than 7 days

### Deep Clean (When needed)

**Clean all node_modules:**
```bash
# Frontend
rm -rf frontend/node_modules

# Services
rm -rf services/*/node_modules

# Reinstall
cd frontend && npm install
cd ../services/auth && npm install
# ... repeat for other services
```

**Clean Next.js build:**
```bash
cd frontend
rm -rf .next
npm run build  # or npm run dev
```

**Clean npm cache:**
```bash
npm cache clean --force
```

**Clean Docker:**
```bash
# Remove stopped containers
docker container prune -f

# Remove unused images
docker image prune -f

# Remove unused volumes
docker volume prune -f
```

## What to Keep vs Remove

### ✅ Safe to Remove:
- `*.bak`, `*.backup` files
- `frontend/.next/` (build cache - regenerates)
- Old log files (>7 days)
- `node_modules/` (can reinstall)
- `.DS_Store`, `Thumbs.db` (OS files)
- Editor temp files (`.swp`, `.swo`)

### ⚠️ Keep These:
- `.env.local` files (your secrets!)
- `package.json`, `package-lock.json`
- Source code files
- `services/logs/` directory (keep structure)
- Configuration files

### ❌ Never Remove:
- `.git/` directory
- Active `.env.local` files
- Source code
- `README.md` and documentation

## Automated Cleanup Schedule

### Daily (Automatic)
- Temporary editor files
- OS metadata files

### Weekly (Manual)
```bash
./cleanup.sh
```

### Monthly (Manual)
```bash
# Clean old logs
find services/logs -name "*.log" -mtime +30 -delete

# Clean Docker
docker system prune -f
```

### Before Git Commit
```bash
# The .gitignore already prevents committing:
# - node_modules/
# - .env files
# - Log files
# - Build outputs
# - Backup files

# But you can verify:
git status
```

## Disk Space Analysis

### Check what's using space:
```bash
# Check directory sizes
du -sh frontend/node_modules
du -sh services/*/node_modules
du -sh frontend/.next

# Check total project size
du -sh .

# Check largest files
find . -type f -size +10M -exec ls -lh {} \;
```

### Typical Sizes:
- Frontend node_modules: ~300-500 MB
- Each service node_modules: ~100-200 MB
- Frontend .next cache: ~50-100 MB
- Logs: Should be minimal if rotated

## When to Clean

### Clean Immediately:
- ✅ Backup files after confirming changes work
- ✅ Old logs (>7 days)
- ✅ Temporary editor files
- ✅ OS metadata files

### Clean When Needed:
- ⚠️ Build cache when having issues
- ⚠️ node_modules when dependencies are broken
- ⚠️ Docker images/containers when running out of space

### Never Clean:
- ❌ Active source code
- ❌ Configuration files in use
- ❌ Current .env files
- ❌ Git repository (.git/)

## Cleanup Script Details

The `cleanup.sh` script:
1. Removes backup files (`*-backup.js`, `*.bak`)
2. Cleans Next.js cache `.old` files
3. Removes editor temporary files
4. Cleans logs older than 7 days
5. Removes OS metadata files

**Safe to run anytime** - won't affect running services.

## Prevent Future Clutter

### 1. Don't create backup files manually
```bash
# Bad
cp file.js file.js.bak

# Good - use git instead
git add file.js
git commit -m "working version"
```

### 2. Use git branches for experiments
```bash
# Create a branch for testing
git checkout -b experiment/new-feature

# If it works, merge it
git checkout main
git merge experiment/new-feature

# If it doesn't, just delete the branch
git branch -d experiment/new-feature
```

### 3. Configure your editor
Most editors can be configured to not create swap files in the project directory.

### 4. Log rotation
Consider implementing log rotation for production:
```bash
# Install logrotate (if not already)
# Configure in /etc/logrotate.d/
```

## Quick Reference

```bash
# Quick cleanup (safe anytime)
./cleanup.sh

# Check what git will ignore
git status --ignored

# Check disk usage
du -sh *

# Find large files
find . -type f -size +10M

# Clean specific service
cd services/auth && rm -rf node_modules && npm install

# Clean frontend build
cd frontend && rm -rf .next && npm run dev

# Clean Docker
docker system prune -af
```

## Summary

✅ Your project is now clean of:
- Backup files (authController-backup.js, jwt-backup.js)
- Old cache files
- Temporary editor files
- Old logs

🎯 **Total space saved:** ~1-5 MB from backups and cache files

💡 **Next time:** Just run `./cleanup.sh` periodically to keep things tidy!

All unnecessary files are removed and your `.gitignore` will prevent them from being committed to git. 🎉
