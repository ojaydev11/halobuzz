# Vercel Deployment Guide - Admin Dashboard

This guide covers deploying the HaloBuzz admin dashboard to Vercel.

## Prerequisites

- Vercel account
- GitHub repository with HaloBuzz code
- Backend API deployed on Railway
- Domain for admin panel (optional)

## Service Overview

The admin dashboard is a Next.js application located in the `admin/` folder that provides:
- User management
- Content moderation
- Analytics dashboard
- System configuration
- Security monitoring

## 1. Project Setup

### Create Vercel Project

1. Go to Vercel dashboard
2. Click "Add New..." → "Project"
3. Import your HaloBuzz GitHub repository
4. Framework Preset: Next.js
5. Root Directory: `admin`
6. Name: `halobuzz-admin`

### Build Configuration

Vercel auto-detects Next.js. The build settings should be:
- **Framework**: Next.js
- **Root Directory**: `admin`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm ci`

## 2. Environment Variables

Set these environment variables in Vercel project settings:

### Core Configuration
```bash
NODE_ENV=production
NEXT_PUBLIC_API_BASE=https://halobuzz-backend.railway.app
NEXT_PUBLIC_APP_NAME=HaloBuzz Admin
NEXT_PUBLIC_VERSION=0.1.0
```

### Authentication & Security
```bash
ADMIN_JWT_SECRET=your-super-secure-admin-jwt-secret-minimum-32-chars
ADMIN_TOTP_REQUIRED=true
NEXTAUTH_URL=https://your-admin-domain.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret-minimum-32-chars
```

### API Integration
```bash
BACKEND_API_KEY=your-backend-api-key
BACKEND_WEBHOOK_SECRET=your-webhook-secret
```

### Feature Flags
```bash
NEXT_PUBLIC_ENABLE_2FA=true
NEXT_PUBLIC_ENABLE_AUDIT_LOGS=true
NEXT_PUBLIC_ENABLE_REAL_TIME=true
```

## 3. Security Configuration

### Headers Configuration

The `vercel.json` file includes security headers:

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
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "no-referrer"
        }
      ]
    }
  ]
}
```

### Content Security Policy

CSP is configured in the middleware to allow:
- Self-hosted scripts and styles
- Google Fonts
- Backend API connections
- No inline scripts (except Next.js required)

### Authentication Flow

1. **Login**: Username/password authentication
2. **2FA**: TOTP verification (if enabled)
3. **Session**: Secure JWT tokens with CSRF protection
4. **Auto-logout**: Session timeout and cleanup

## 4. CORS Configuration

Update your Railway backend `CORS_ORIGIN` to include the Vercel domain:

```bash
CORS_ORIGIN=https://your-admin-domain.vercel.app,https://halobuzz-admin.vercel.app
```

## 5. Custom Domain Setup

### Add Custom Domain

1. Go to Vercel project settings
2. Navigate to "Domains"
3. Add your custom domain (e.g., `admin.halobuzz.com`)
4. Configure DNS as instructed by Vercel

### DNS Configuration

For `admin.halobuzz.com`:
```
Type: CNAME
Name: admin
Value: cname.vercel-dns.com
```

### SSL Certificate

Vercel automatically provisions SSL certificates for all domains.

## 6. Performance Optimization

### Caching Strategy

```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, no-cache, must-revalidate"
        }
      ]
    },
    {
      "source": "/_next/static/(.*)",
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

### Image Optimization

Next.js Image component is configured for optimal loading:
- Automatic WebP conversion
- Responsive image sizing
- Lazy loading by default

### Bundle Analysis

Monitor bundle size:
```bash
npm install --save-dev @next/bundle-analyzer
```

Add to `next.config.js`:
```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // Next.js config
});
```

## 7. Monitoring and Analytics

### Vercel Analytics

Enable Vercel Analytics in project settings for:
- Page views
- Performance metrics
- User sessions
- Core Web Vitals

### Error Monitoring

Consider integrating Sentry for error tracking:

```bash
npm install @sentry/nextjs
```

### Uptime Monitoring

Set up external monitoring for:
- `/login` page availability
- `/api/health` endpoint
- Authentication flow

## 8. Deployment Pipeline

### Automatic Deployments

Vercel automatically deploys on git push to main branch.

### Preview Deployments

- Pull requests get preview URLs
- Test changes before merging
- Environment variables are inherited

### Production Deployments

1. **Automatic**: Push to main branch
2. **Manual**: Use Vercel CLI or dashboard
3. **Rollback**: Instant rollback in dashboard

## 9. Environment-Specific Configuration

### Development
```bash
NODE_ENV=development
NEXT_PUBLIC_API_BASE=http://localhost:3000
ADMIN_TOTP_REQUIRED=false
```

### Staging
```bash
NODE_ENV=staging
NEXT_PUBLIC_API_BASE=https://halobuzz-backend-staging.railway.app
ADMIN_TOTP_REQUIRED=true
```

### Production
```bash
NODE_ENV=production
NEXT_PUBLIC_API_BASE=https://halobuzz-backend.railway.app
ADMIN_TOTP_REQUIRED=true
```

## 10. Security Best Practices

### Access Control

- Admin users only
- Role-based permissions
- Session timeout (30 minutes)
- IP-based restrictions (optional)

### Data Protection

- No sensitive data in client-side code
- Secure cookie settings
- CSRF protection on all forms
- Input validation and sanitization

### Audit Logging

All admin actions are logged:
- User management changes
- System configuration updates
- Security events
- Data exports

## 11. Backup and Recovery

### Code Backup

- GitHub repository (primary)
- Vercel deployment history
- Local development backups

### Configuration Backup

- Environment variables documented
- Deployment settings exported
- DNS configuration documented

### Recovery Procedures

1. **Code Issues**: Rollback to previous deployment
2. **Configuration Issues**: Restore from documented settings
3. **Domain Issues**: Update DNS configuration
4. **Security Issues**: Rotate secrets and redeploy

## 12. Cost Optimization

### Vercel Pricing

- **Hobby**: Free for personal projects
- **Pro**: $20/month per team member
- **Enterprise**: Custom pricing

### Usage Optimization

- **Function Execution**: Optimize API routes
- **Bandwidth**: Use CDN for static assets
- **Build Time**: Optimize build process

## 13. Troubleshooting

### Common Issues

**Build Failures:**
- Check Node.js version compatibility
- Verify TypeScript compilation
- Review dependency versions

**Runtime Errors:**
- Check environment variables
- Verify API connectivity
- Review browser console errors

**Authentication Issues:**
- Verify JWT secrets match backend
- Check CORS configuration
- Review cookie settings

### Debug Tools

- **Vercel Logs**: Function execution logs
- **Browser DevTools**: Client-side debugging
- **Network Tab**: API request inspection

## 14. Performance Monitoring

### Core Web Vitals

Monitor these metrics:
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

### Performance Budget

Set limits for:
- JavaScript bundle size: < 200KB
- CSS bundle size: < 50KB
- Total page size: < 500KB
- Time to Interactive: < 3s

## 15. Compliance and Legal

### Data Handling

- No PII stored in client
- Secure data transmission
- Audit trail for all actions
- GDPR compliance features

### Security Headers

All required security headers are configured:
- HSTS for HTTPS enforcement
- CSP for XSS protection
- Frame options for clickjacking protection
- Content type sniffing protection

## 16. Deployment Checklist

Before going live:

- [ ] All environment variables configured
- [ ] CORS settings updated in backend
- [ ] Custom domain configured and verified
- [ ] SSL certificate active
- [ ] Security headers tested
- [ ] Authentication flow tested
- [ ] 2FA setup tested (if enabled)
- [ ] API connectivity verified
- [ ] Performance metrics within targets
- [ ] Error monitoring configured
- [ ] Backup procedures documented
- [ ] Access controls configured
- [ ] Audit logging enabled

## 17. Post-Deployment

### Monitoring Setup

1. Configure uptime monitoring
2. Set up error alerts
3. Monitor performance metrics
4. Review security logs regularly

### Maintenance Tasks

- Regular dependency updates
- Security patch reviews
- Performance optimization
- User access reviews

### Documentation Updates

- Keep deployment docs current
- Update environment variable docs
- Maintain troubleshooting guides
- Document configuration changes
