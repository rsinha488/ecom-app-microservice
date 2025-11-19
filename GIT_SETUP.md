# Git Setup Guide

## Files Created

✅ **`.gitignore`** - Root level gitignore file
✅ **`services/auth/.env.example`** - Example environment variables for auth service
✅ **`frontend/.env.example`** - Example environment variables for frontend

## What's Ignored

The `.gitignore` file prevents the following from being committed:

### 🔒 Secrets & Environment Variables
- All `.env` and `.env.local` files
- API keys, database credentials, JWT secrets

### 📦 Dependencies
- `node_modules/` directories
- Package manager cache files

### 📝 Logs
- All `*.log` files
- Log directories in services and API gateway

### 💻 IDE/Editor Files
- `.vscode/`, `.idea/` (except settings you want to share)
- Temporary editor files

### 🏗️ Build Outputs
- `frontend/.next/`, `frontend/out/`
- `dist/`, `build/` directories

### 🗄️ Database Files
- MongoDB data directories
- SQL dumps and backups

### 🐳 Docker
- docker-compose override files

### 🖼️ User Generated Content
- uploads/ directories
- temporary files

## Initialize Git Repository

```bash
cd /home/ruchisinha/Desktop/LaunchpadMERN

# Initialize git repository
git init

# Add all files (respecting .gitignore)
git add .

# Create first commit
git commit -m "Initial commit: MERN e-commerce platform with microservices"
```

## Create GitHub Repository

### Option 1: Using GitHub CLI (gh)

```bash
# Create private repository
gh repo create LaunchpadMERN --private --source=. --remote=origin

# Push to GitHub
git push -u origin main
```

### Option 2: Manual Setup

1. Go to https://github.com/new
2. Create a new repository named `LaunchpadMERN`
3. Choose Private or Public
4. **DO NOT** initialize with README, .gitignore, or license
5. Copy the repository URL

```bash
# Add remote origin
git remote add origin https://github.com/YOUR_USERNAME/LaunchpadMERN.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

## Environment Variables Setup for Team

When sharing with team members, they need to:

1. **Clone the repository**:
```bash
git clone https://github.com/YOUR_USERNAME/LaunchpadMERN.git
cd LaunchpadMERN
```

2. **Copy example files to create local env files**:
```bash
# Auth service
cp services/auth/.env.example services/auth/.env.local

# Frontend
cp frontend/.env.example frontend/.env.local

# Other services (if needed)
cp services/products/.env.example services/products/.env.local
cp services/categories/.env.example services/categories/.env.local
cp services/users/.env.example services/users/.env.local
cp services/orders/.env.example services/orders/.env.local
```

3. **Update the values** in `.env.local` files with actual secrets

4. **Install dependencies**:
```bash
# Frontend
cd frontend && npm install

# Services
cd ../services/auth && npm install
cd ../products && npm install
cd ../categories && npm install
cd ../users && npm install
cd ../orders && npm install
```

5. **Start the application**:
```bash
# Start all services
cd services
./start-all.sh

# Start API Gateway
cd ../api-gateway
./start-gateway.sh

# Start frontend
cd ../frontend
npm run dev
```

## Important Notes

### ⚠️ Never Commit These Files:
- `.env.local` - Contains actual secrets
- `node_modules/` - Too large, install via npm/yarn
- Log files - Can be regenerated
- Build outputs - Generated files

### ✅ Always Commit These Files:
- `.env.example` - Template for required variables
- `package.json` - Dependency definitions
- Source code files
- Configuration files (except those with secrets)
- Documentation (README, guides)

## Git Workflow

### Daily Development

```bash
# Check status
git status

# Add changes
git add .

# Commit with meaningful message
git commit -m "feat: add user authentication flow"

# Pull latest changes
git pull origin main

# Push your changes
git push origin main
```

### Feature Development

```bash
# Create feature branch
git checkout -b feature/add-payment-gateway

# Make changes and commit
git add .
git commit -m "feat: integrate Stripe payment"

# Push feature branch
git push origin feature/add-payment-gateway

# Create pull request on GitHub
# After review, merge to main
```

## Commit Message Convention

Use conventional commits for better changelog:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

Examples:
```bash
git commit -m "feat: add shopping cart functionality"
git commit -m "fix: resolve CORS issues with API gateway"
git commit -m "docs: update OAuth2 implementation guide"
git commit -m "refactor: optimize product query performance"
```

## Checking What Will Be Committed

```bash
# See which files will be committed
git status

# See which files are ignored
git status --ignored

# Test what would be added
git add --dry-run .
```

## Verify .gitignore is Working

```bash
# Check if .env files are ignored
git check-ignore -v services/auth/.env.local
# Should output: .gitignore:3:**/.env.local   services/auth/.env.local

# Check if node_modules is ignored
git check-ignore -v frontend/node_modules
# Should output: .gitignore:X:node_modules/   frontend/node_modules
```

## .gitignore Summary

Your repository will **ignore**:
- ✅ All `.env` and `.env.local` files (secrets safe!)
- ✅ All `node_modules/` directories
- ✅ All log files
- ✅ IDE-specific files
- ✅ Build outputs
- ✅ Temporary files
- ✅ OS-specific files

Your repository will **include**:
- ✅ Source code
- ✅ `.env.example` templates
- ✅ Configuration files
- ✅ Documentation
- ✅ Scripts
- ✅ Package.json files

## Team Collaboration

### First Time Setup for New Team Member

1. Get repository access
2. Clone repository
3. Copy `.env.example` to `.env.local`
4. Ask team lead for actual secret values
5. Install dependencies
6. Start services

### Security Best Practices

1. **Never commit secrets** - Use `.env.local` and add to `.gitignore`
2. **Use `.env.example`** - Document required variables
3. **Rotate secrets** - Change secrets if accidentally committed
4. **Use git-secrets** - Install hooks to prevent secret commits
5. **Review commits** - Check before pushing

## Additional Resources

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Ignore Generator](https://www.toptal.com/developers/gitignore)

## Quick Reference

```bash
# Status
git status                    # Check current status
git log --oneline            # View commit history

# Staging
git add .                    # Stage all changes
git add file.js              # Stage specific file
git reset file.js            # Unstage file

# Committing
git commit -m "message"      # Commit with message
git commit --amend           # Amend last commit

# Branching
git branch                   # List branches
git checkout -b new-branch   # Create and switch to new branch
git checkout main            # Switch to main branch
git merge feature-branch     # Merge branch into current

# Remote
git remote -v                # Show remotes
git push origin main         # Push to remote
git pull origin main         # Pull from remote
git fetch                    # Fetch remote changes

# Undoing
git reset --soft HEAD^       # Undo last commit (keep changes)
git reset --hard HEAD^       # Undo last commit (discard changes)
git checkout -- file.js      # Discard file changes
```

## Summary

Your project is now ready for version control! All sensitive files are protected by `.gitignore`, and team members can use `.env.example` files to set up their local environment.

🎉 **You can safely commit and push to GitHub now!**
