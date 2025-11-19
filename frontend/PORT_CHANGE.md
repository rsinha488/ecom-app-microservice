# Port Change - 3005 → 3006

## Issue Resolved

**Problem**: Port 3005 was already in use by another Next.js process
**Error**: `EADDRINUSE: address already in use :::3005`

**Solution**: Changed frontend port to **3006**

## Changes Made

### 1. package.json
```json
"scripts": {
  "dev": "next dev -p 3006",
  "start": "next start -p 3006"
}
```

### 2. .env.local
```env
NEXT_PUBLIC_OAUTH_REDIRECT_URI=http://localhost:3006/auth/callback
NEXTAUTH_URL=http://localhost:3006
NEXT_PUBLIC_APP_URL=http://localhost:3006
```

## New Access URLs

✅ **Frontend**: http://localhost:3006
✅ **OAuth Callback**: http://localhost:3006/auth/callback

## Backend Services (Unchanged)

- Auth: http://localhost:3000
- Products: http://localhost:3001
- Categories: http://localhost:3002
- Users: http://localhost:3003
- Orders: http://localhost:3004

## How to Run

```bash
cd frontend
npm run dev
```

Then visit: **http://localhost:3006**

## Status

```
✅ Application running successfully on port 3006
✅ All dependencies installed
✅ Environment variables updated
✅ No port conflicts
```

## Note

If you need to use port 3005 again:
1. Kill the process using port 3005:
   ```bash
   sudo lsof -ti:3005 | xargs sudo kill -9
   ```
2. Change back to port 3005 in package.json and .env.local
