# Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Site Configuration
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
NEXT_PUBLIC_SITE_NAME="Your E-commerce Platform"

# Microservices URLs (Production)
NEXT_PUBLIC_AUTH_URL=https://auth.your-domain.com
NEXT_PUBLIC_PRODUCTS_URL=https://products.your-domain.com
NEXT_PUBLIC_CATEGORIES_URL=https://categories.your-domain.com
NEXT_PUBLIC_USERS_URL=https://users.your-domain.com
NEXT_PUBLIC_ORDERS_URL=https://orders.your-domain.com

# OAuth Configuration
NEXT_PUBLIC_OAUTH_CLIENT_ID=your-production-client-id
NEXT_PUBLIC_OAUTH_REDIRECT_URI=https://your-domain.com/callback
NEXT_PUBLIC_OAUTH_SCOPE=openid profile email

# OAuth Secret (Server-side only, not exposed to browser)
OAUTH_CLIENT_SECRET=your-very-secure-production-secret

# SEO & Analytics
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=your-google-verification-code
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Error Tracking (Optional)
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# Logging (Optional)
NEXT_PUBLIC_LOG_ENDPOINT=https://logs.your-domain.com/api/logs

# Feature Flags (Optional)
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_ERROR_TRACKING=true
```

### 2. Security Audit

#### ✅ Remove Development Artifacts
- [ ] No `console.log` statements in production code (handled by `removeConsole: true`)
- [ ] No hardcoded API keys or secrets
- [ ] OAuth client secret not exposed to browser
- [ ] All sensitive data in environment variables

#### ✅ Security Headers (Already configured in `next.config.js`)
- [x] X-Frame-Options: SAMEORIGIN
- [x] X-Content-Type-Options: nosniff
- [x] Referrer-Policy: origin-when-cross-origin
- [x] X-DNS-Prefetch-Control: on

#### ✅ Additional Security (Recommended)
Add to `next.config.js` headers:
```javascript
{
  key: 'Content-Security-Policy',
  value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.google-analytics.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.your-domain.com;"
},
{
  key: 'Strict-Transport-Security',
  value: 'max-age=63072000; includeSubDomains; preload'
},
{
  key: 'Permissions-Policy',
  value: 'camera=(), microphone=(), geolocation=()'
}
```

### 3. Performance Optimization

#### ✅ Image Optimization
- [ ] Replace placeholder images with actual production images
- [ ] Add `/public/icon-192x192.png` (192x192px)
- [ ] Add `/public/icon-512x512.png` (512x512px)
- [ ] Add `/public/apple-touch-icon.png` (180x180px)
- [ ] Add `/public/og-image.png` (1200x630px for social sharing)
- [ ] Add `/public/favicon.ico`

#### ✅ SEO Assets
- [x] `robots.txt` created
- [x] Dynamic sitemap generation (`/sitemap.xml`)
- [x] Manifest file for PWA (`manifest.json`)
- [ ] Update `robots.txt` with production domain
- [ ] Verify all metadata is production-ready

### 4. Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build test
npm run build

# Test production build locally
npm run start
```

### 5. Analytics & Monitoring

#### Google Analytics Setup
1. Create GA4 property
2. Add measurement ID to `.env.production`
3. Install analytics package:
```bash
npm install --save @next/third-parties
```

4. Add to `app/layout.tsx`:
```tsx
import { GoogleAnalytics } from '@next/third-parties/google'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
      <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
    </html>
  )
}
```

#### Error Tracking (Sentry)
```bash
npm install --save @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### 6. Database & API Readiness

#### Microservices Health Check
Verify all services are running and accessible:
- [ ] Auth Service health endpoint
- [ ] Products Service health endpoint
- [ ] Orders Service health endpoint
- [ ] Categories Service health endpoint
- [ ] Users Service health endpoint

#### Database
- [ ] MongoDB indexes created for performance
- [ ] Database backup strategy in place
- [ ] Connection pooling configured
- [ ] Database credentials secured

---

## Deployment Options

### Option 1: Vercel (Recommended for Next.js)

#### Prerequisites
- Vercel account
- GitHub/GitLab repository

#### Steps
1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Configure Environment Variables**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add all production environment variables

5. **Set up Domains**
   - Add custom domain in Vercel Dashboard
   - Configure DNS records (A or CNAME)

#### Advantages
- Zero-configuration deployment
- Automatic HTTPS
- Global CDN
- Serverless functions
- Preview deployments for PRs
- Built-in analytics

### Option 2: Docker + Cloud Provider (AWS, Google Cloud, Azure)

#### Dockerfile
Create `Dockerfile` in frontend directory:

```dockerfile
# Multi-stage build for optimal image size
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild source code
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set production environment variables
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Build application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### Build and Deploy
```bash
# Build image
docker build -t ecommerce-frontend:latest .

# Run locally for testing
docker run -p 3000:3000 --env-file .env.production ecommerce-frontend:latest

# Tag for registry
docker tag ecommerce-frontend:latest your-registry/ecommerce-frontend:latest

# Push to registry
docker push your-registry/ecommerce-frontend:latest

# Deploy to Kubernetes/ECS/etc.
```

### Option 3: Traditional Server (PM2)

#### Prerequisites
- Node.js 18+ installed on server
- PM2 process manager

#### Steps
1. **Install PM2**
   ```bash
   npm install -g pm2
   ```

2. **Build Application**
   ```bash
   npm run build
   ```

3. **Create PM2 Configuration** (`ecosystem.config.js`):
   ```javascript
   module.exports = {
     apps: [{
       name: 'ecommerce-frontend',
       script: 'node_modules/next/dist/bin/next',
       args: 'start -p 3006',
       instances: 'max',
       exec_mode: 'cluster',
       env_production: {
         NODE_ENV: 'production',
         PORT: 3006
       }
     }]
   };
   ```

4. **Start Application**
   ```bash
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

5. **Configure Nginx Reverse Proxy**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3006;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## Post-Deployment

### 1. Verification Checklist
- [ ] All pages load correctly
- [ ] Authentication flow works
- [ ] Product listing loads
- [ ] Cart functionality works
- [ ] Checkout process completes
- [ ] Order history displays
- [ ] Images load properly
- [ ] No console errors in browser
- [ ] Mobile responsiveness verified
- [ ] SEO meta tags present (view page source)
- [ ] Sitemap accessible at `/sitemap.xml`
- [ ] Robots.txt accessible at `/robots.txt`

### 2. SEO Setup
```bash
# Submit sitemap to Google Search Console
https://your-domain.com/sitemap.xml

# Verify ownership
- Add Google Site Verification code
- Or upload verification file to /public
```

### 3. Performance Monitoring

#### Google PageSpeed Insights
```
https://pagespeed.web.dev/
```
Target scores:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 95+

#### Core Web Vitals
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

### 4. Continuous Monitoring

- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure error alerts (Sentry, email)
- [ ] Monitor server resources (CPU, memory)
- [ ] Track analytics daily
- [ ] Review error logs weekly

---

## Scaling Considerations

### CDN Configuration
Use a CDN for static assets:
- Cloudflare
- AWS CloudFront
- Fastly

### Caching Strategy
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

### Load Balancing
For high traffic, deploy multiple instances behind a load balancer:
- AWS ELB/ALB
- Google Cloud Load Balancer
- Nginx Load Balancer

---

## Rollback Plan

### Quick Rollback Steps
1. **Vercel**: Click "Rollback" on previous deployment
2. **Docker**: Deploy previous image tag
3. **PM2**: Restore previous code and `pm2 restart`

### Database Rollback
- Have database backup before each deployment
- Test restore procedure regularly
- Document rollback steps

---

## Support & Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

#### Environment Variables Not Working
- Verify `.env.production` is loaded
- Check variable names start with `NEXT_PUBLIC_` for client-side
- Restart server after env changes

#### Images Not Loading
- Check `next.config.js` remote patterns
- Verify image URLs are accessible
- Check CORS headers on image server

---

## Production Checklist Summary

- [ ] Environment variables configured
- [ ] Security headers enabled
- [ ] All images added to `/public`
- [ ] Build succeeds without errors
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Analytics configured
- [ ] Error tracking set up
- [ ] Domain configured
- [ ] HTTPS enabled
- [ ] Database ready
- [ ] All microservices accessible
- [ ] Sitemap submitted to search engines
- [ ] Monitoring enabled
- [ ] Backup strategy in place
- [ ] Rollback plan documented

---

**Ready to Deploy!** 🚀

For questions or issues, contact the development team.
