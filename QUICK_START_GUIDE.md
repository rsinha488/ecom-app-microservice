# Quick Start Guide - E-commerce Application

## 🚀 Getting Started in 3 Steps

### 1. Start Backend Services

```bash
cd services
./start-all.sh
```

This will start all microservices:
- ✅ Auth Service (port 3000)
- ✅ Products Service (port 3001)
- ✅ Categories Service (port 3002)
- ✅ Users Service (port 3003)
- ✅ Orders Service (port 3004)

**Verify all services are healthy**:
```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
```

### 2. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at: **http://localhost:3006**

### 3. Access the Application

Open your browser and navigate to:
```
http://localhost:3006
```

You'll be redirected to the login page!

## 📝 First Time User Journey

### Register a New Account

1. **Visit**: http://localhost:3006
2. **Click**: "Create an account"
3. **Fill in the form**:
   - Full Name: Your Name
   - Email: your.email@example.com
   - Password: Must be 8+ characters with uppercase, lowercase, and number
   - Confirm Password: Same as password
   - Check "I agree to Terms..."
4. **Click**: "Create account"
5. **Success**: You'll be redirected to login page

### Login

1. **Enter credentials**:
   - Email: your.email@example.com
   - Password: Your password
2. **Click**: "Sign in"
3. **Success**: Redirected to Products page

### Browse Products

1. **View Products**: Responsive grid layout
2. **Filter Products**:
   - Click "Filters" button
   - Select category, price range, stock status
   - Sort by price, name, or newest
3. **Search**: Use search bar at the top
4. **Add to Cart**: Click cart icon on product cards

### Shopping Cart

1. **View Cart**: Click cart icon in header (shows item count)
2. **Cart Badge**: Displays total items in cart
3. **Persistent**: Cart survives page refreshes (localStorage)

### Logout

1. **Click**: User menu (top right)
2. **Select**: "Logout"
3. **Result**: Redirected to login, all state cleared

## 🔐 Security Features

### Session Management

- **HTTP-Only Cookies**: Tokens stored securely, inaccessible to JavaScript
- **Auto-Refresh**: Access tokens refresh every 14 minutes automatically
- **Session Persistence**: Stay logged in across page reloads
- **Secure Logout**: All cookies cleared, tokens revoked

### Protection

- **Route Protection**: Automatic redirect if not authenticated
- **CSRF Protection**: SameSite cookies
- **XSS Protection**: Content Security Policy headers
- **HTTPS Ready**: Secure flag enabled in production

## 📱 Responsive Design

### Mobile (< 640px)
- Hamburger menu
- Single column layout
- Touch-optimized buttons
- Collapsible filters

### Tablet (640px - 1024px)
- 2-column product grid
- Expanded navigation
- Optimized spacing

### Desktop (> 1024px)
- 3-4 column product grid
- Full navigation
- Hover effects
- Dropdown menus

## 🛠️ Development Commands

### Frontend

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

### Backend Services

```bash
# Start all services
./start-all.sh

# Stop all services
./stop-all.sh

# View logs
tail -f logs/auth.log
tail -f logs/products.log

# Individual service
cd auth
npm run dev
```

## 🔍 Troubleshooting

### Can't Access Frontend

**Problem**: http://localhost:3006 not responding

**Solution**:
```bash
# Check if server is running
lsof -i:3006

# Kill existing process
lsof -ti:3006 | xargs kill -9

# Restart
cd frontend
npm run dev
```

### Backend Services Not Responding

**Problem**: Services not healthy

**Solution**:
```bash
# Check MongoDB is running
pgrep mongod

# Restart services
cd services
./stop-all.sh
./start-all.sh

# Check logs
tail -f logs/*.log
```

### Login Not Working

**Problem**: Authentication fails

**Solution**:
1. Check auth service is running: `curl http://localhost:3000/health`
2. Clear browser cookies
3. Check browser console for errors
4. Verify .env.local has correct API URLs

### Session Not Persisting

**Problem**: Logged out after refresh

**Solution**:
1. Check browser cookies (DevTools → Application → Cookies)
2. Verify cookies: `user`, `accessToken`, `refreshToken`
3. Clear all cookies and login again
4. Check browser console for errors

### Port Already in Use

**Problem**: EADDRINUSE error

**Solution**:
```bash
# Frontend (3006)
lsof -ti:3006 | xargs kill -9

# Backend services
./services/stop-all.sh
```

## 📚 Key Files & Locations

### Authentication

- **Login Page**: `frontend/src/app/auth/login/page.tsx`
- **Register Page**: `frontend/src/app/auth/register/page.tsx`
- **Auth API Routes**: `frontend/src/app/api/auth/`
- **Auth Redux Slice**: `frontend/src/store/slices/authSlice.ts`

### UI Components

- **Header**: `frontend/src/components/layout/Header.tsx`
- **Product Card**: `frontend/src/components/product/ProductCard.tsx`
- **Products Page**: `frontend/src/app/products/page.tsx`

### Configuration

- **Environment**: `frontend/.env.local`
- **Next.js Config**: `frontend/next.config.js`
- **Tailwind Config**: `frontend/tailwind.config.js`
- **Security Middleware**: `frontend/src/middleware.ts`

### Backend

- **Auth Service**: `services/auth/`
- **Products Service**: `services/products/`
- **All Services**: `services/*/`

## 🎯 Testing Checklist

### Authentication Flow
- [ ] Register new account
- [ ] Login with credentials
- [ ] Session persists on refresh
- [ ] Logout clears state
- [ ] Protected routes redirect to login
- [ ] Auto-refresh works (wait 14+ minutes)

### Products
- [ ] Products load and display
- [ ] Filters work (category, price, search)
- [ ] Add to cart works
- [ ] Cart badge updates
- [ ] Cart persists on refresh

### Responsive Design
- [ ] Mobile layout works (< 640px)
- [ ] Tablet layout works (640-1024px)
- [ ] Desktop layout works (> 1024px)
- [ ] Mobile menu functions
- [ ] Touch targets are adequate

### Security
- [ ] HTTP-only cookies set
- [ ] Tokens not accessible via JS
- [ ] CSRF protection (SameSite)
- [ ] Security headers present
- [ ] XSS protection active

## 📖 Documentation

For detailed documentation, see:

- **[AUTHENTICATION_IMPLEMENTATION_SUMMARY.md](AUTHENTICATION_IMPLEMENTATION_SUMMARY.md)** - Complete auth implementation details
- **[CURRENT_STATUS.md](CURRENT_STATUS.md)** - System status and API endpoints
- **[frontend/NEXTJS_IMPLEMENTATION_GUIDE.md](frontend/NEXTJS_IMPLEMENTATION_GUIDE.md)** - Next.js best practices
- **[services/ARCHITECTURE.md](services/ARCHITECTURE.md)** - System architecture
- **[services/PRODUCTION_DEPLOYMENT_GUIDE.md](services/PRODUCTION_DEPLOYMENT_GUIDE.md)** - Production deployment

## 💡 Tips & Best Practices

### Development

1. **Always check service health** before testing features
2. **Use browser DevTools** to inspect cookies and network requests
3. **Check console logs** for errors and debugging info
4. **Clear cache** if you see stale data

### Security

1. **Never commit** `.env.local` with real secrets
2. **Use HTTPS** in production
3. **Rotate secrets** regularly in production
4. **Monitor logs** for suspicious activity

### Performance

1. **Keep Redux state minimal** - only essential data
2. **Use localStorage** for cart persistence
3. **Leverage Next.js SSR** for better SEO
4. **Optimize images** before deployment

## 🎉 You're All Set!

Your complete e-commerce application with secure authentication is ready to use!

**Access the application**: http://localhost:3006

**Need help?** Check the documentation files listed above or review the logs in `services/logs/`.

Happy coding! 🚀
