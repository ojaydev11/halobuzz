# Vercel Deployment Guide

## Overview
Vercel hosts the HaloBuzz admin dashboard (Next.js application).

## Deployment

### 1. Import Project
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import from GitHub repository
4. Select the `admin/` folder as root directory
5. Framework preset: Next.js (auto-detected)

### 2. Environment Variables
Add the following environment variables in Vercel dashboard:

```bash
# API Configuration
NEXT_PUBLIC_API_BASE=https://<backend>.railway.app

# Optional: Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=<your-analytics-id>
```

### 3. Build Settings
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

## Security Headers

The `admin/vercel.json` file configures security headers:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://<backend>.railway.app; frame-ancestors 'none';"
        }
      ]
    }
  ]
}
```

### CSP Configuration
Update the `Content-Security-Policy` header with your actual backend URL:
- Replace `<backend>.railway.app` with your actual Railway backend URL
- Add any additional domains for external resources if needed

## CORS Configuration

### Backend CORS Setup
Ensure your Railway backend includes Vercel domains in `CORS_ORIGIN`:

```bash
CORS_ORIGIN=https://<your-admin>.vercel.app,https://<preview>--<your-admin>.vercel.app
```

### Preview Deployments
- Vercel automatically creates preview deployments for pull requests
- Each preview gets a unique URL: `https://<preview>--<your-admin>.vercel.app`
- Include preview URLs in backend CORS configuration

## Caching Configuration

### Static Assets
- Vercel automatically caches static assets (CSS, JS, images)
- Cache duration: 1 year for immutable assets
- Automatic cache invalidation on new deployments

### API Routes
- API routes are not cached by default
- Dynamic content served fresh on each request

### Custom Cache Rules
The `vercel.json` file includes cache rules:

```json
{
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

## Authentication

### Admin Access
1. Deploy the admin dashboard
2. Visit `https://<your-admin>.vercel.app/login`
3. Use an email address listed in `ADMIN_EMAILS` environment variable
4. Login with your registered credentials

### Session Management
- Sessions managed by backend API
- JWT tokens stored in httpOnly cookies
- Automatic token refresh handled by frontend

## Monitoring

### Vercel Analytics
1. Enable Vercel Analytics in dashboard
2. Add `NEXT_PUBLIC_VERCEL_ANALYTICS_ID` environment variable
3. Monitor page views, performance metrics

### Error Tracking
- Vercel automatically tracks build and runtime errors
- Access error logs in Vercel dashboard
- Set up error notifications for critical issues

### Performance Monitoring
- Core Web Vitals automatically tracked
- Performance insights available in Vercel dashboard
- Monitor for performance regressions

## Deployment Workflow

### Automatic Deployments
- **Production**: Deploys on push to main/master branch
- **Preview**: Deploys on pull requests
- **Manual**: Can trigger deployments from dashboard

### Build Process
1. Install dependencies (`npm install`)
2. Run build command (`npm run build`)
3. Deploy to Vercel edge network
4. Update DNS (if custom domain configured)

## Custom Domain

### Setup
1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. SSL certificate automatically provisioned

### DNS Configuration
```
Type: CNAME
Name: admin (or subdomain of choice)
Value: cname.vercel-dns.com
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check build logs in Vercel dashboard
   - Verify all dependencies in `package.json`
   - Ensure TypeScript compilation passes

2. **Environment Variables**
   - Verify all required env vars are set
   - Check variable names match exactly
   - Redeploy after adding new variables

3. **CORS Errors**
   - Verify backend `CORS_ORIGIN` includes Vercel domain
   - Check for trailing slashes in URLs
   - Ensure HTTPS is used for production

4. **Authentication Issues**
   - Verify `ADMIN_EMAILS` includes your email
   - Check backend authentication endpoints
   - Clear browser cookies and retry

### Debug Commands
```bash
# Local development
npm run dev

# Build locally
npm run build

# Start production build
npm start

# Check build output
npm run build && ls -la .next/
```

## Performance Optimization

### Image Optimization
- Use Next.js Image component for automatic optimization
- Images served from Vercel's global CDN
- Automatic WebP conversion when supported

### Code Splitting
- Automatic code splitting by Next.js
- Dynamic imports for route-based splitting
- Optimized bundle sizes

### Edge Functions
- API routes run on Vercel's edge network
- Reduced latency for global users
- Automatic scaling based on demand