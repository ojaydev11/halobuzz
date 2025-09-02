# Production Rollback Guide

This guide explains how to rollback deployments on Railway and Vercel in case of issues.

## Railway Rollback

### Method 1: Railway Dashboard (Recommended)

1. **Access Railway Dashboard**
   - Go to [railway.app](https://railway.app)
   - Navigate to your project
   - Select the service (backend or ai-engine)

2. **View Deployment History**
   - Click on "Deployments" tab
   - You'll see a list of recent deployments with timestamps
   - Each deployment shows status (Success/Failed) and commit hash

3. **Rollback to Previous Deployment**
   - Find the last known good deployment
   - Click the "Redeploy" button next to that deployment
   - Confirm the rollback action
   - Monitor the deployment status

4. **Verify Rollback**
   - Check health endpoints:
     ```bash
     curl https://<your-backend>.railway.app/healthz
     curl https://<your-ai>.railway.app/healthz
     ```
   - Run smoke tests to verify functionality

### Method 2: Railway CLI

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and Connect**
   ```bash
   railway login
   railway link <project-id>
   ```

3. **List Deployments**
   ```bash
   railway deployments
   ```

4. **Rollback to Specific Deployment**
   ```bash
   railway redeploy <deployment-id>
   ```

### Method 3: GitHub Actions (Emergency)

If you need to rollback via code:

1. **Revert the problematic commit**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **This will trigger automatic redeployment**
   - GitHub Actions will detect the push
   - Railway will deploy the reverted code
   - Monitor the deployment status

## Vercel Rollback

### Method 1: Vercel Dashboard (Recommended)

1. **Access Vercel Dashboard**
   - Go to [vercel.com](https://vercel.com)
   - Navigate to your project
   - Click on the project name

2. **View Deployment History**
   - Click on "Deployments" tab
   - You'll see a list of deployments with status and timestamps
   - Each deployment shows the commit hash and build status

3. **Promote Previous Deployment**
   - Find the last known good deployment
   - Click the "..." menu next to that deployment
   - Select "Promote to Production"
   - Confirm the action

4. **Verify Rollback**
   - Check the admin dashboard URL
   - Verify it's working correctly
   - Test key functionality

### Method 2: Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login and Link Project**
   ```bash
   vercel login
   vercel link
   ```

3. **List Deployments**
   ```bash
   vercel ls
   ```

4. **Promote Previous Deployment**
   ```bash
   vercel promote <deployment-url>
   ```

## Database Rollback

### MongoDB Rollback

If you need to rollback database changes:

1. **Use MongoDB Atlas Point-in-Time Recovery**
   - Go to MongoDB Atlas dashboard
   - Navigate to your cluster
   - Go to "Backups" tab
   - Select a restore point before the problematic deployment
   - Click "Restore" and follow the prompts

2. **Manual Data Restoration**
   - Export data from a known good state
   - Import the data to restore the database
   - Verify data integrity

### Redis Rollback

Redis data is typically ephemeral, but if you have persistent data:

1. **Clear Redis Cache**
   ```bash
   redis-cli FLUSHALL
   ```

2. **Restart Redis Service**
   - In Railway dashboard, restart the Redis addon
   - This will clear any corrupted data

## Rollback Checklist

### Before Rollback
- [ ] Identify the problematic deployment
- [ ] Document the issue and symptoms
- [ ] Notify team members
- [ ] Prepare rollback plan

### During Rollback
- [ ] Stop any ongoing deployments
- [ ] Execute rollback procedure
- [ ] Monitor deployment status
- [ ] Verify health endpoints
- [ ] Run smoke tests

### After Rollback
- [ ] Confirm all services are healthy
- [ ] Test critical functionality
- [ ] Monitor for any issues
- [ ] Document the rollback
- [ ] Plan fix for the original issue

## Emergency Procedures

### Complete System Rollback

If you need to rollback the entire system:

1. **Rollback Backend Service**
   - Use Railway dashboard to rollback backend
   - Wait for deployment to complete
   - Verify health endpoint

2. **Rollback AI Engine Service**
   - Use Railway dashboard to rollback AI engine
   - Wait for deployment to complete
   - Verify health endpoint

3. **Rollback Admin Dashboard**
   - Use Vercel dashboard to promote previous deployment
   - Wait for deployment to complete
   - Verify admin dashboard

4. **Run Full Smoke Tests**
   ```bash
   BACKEND_URL=https://<your-backend>.railway.app \
   AI_URL=https://<your-ai>.railway.app \
   AI_ENGINE_SECRET=<your-secret> \
   ./scripts/hosted-smoke.sh
   ```

### Communication Plan

1. **Internal Communication**
   - Notify development team
   - Update status page if applicable
   - Document the incident

2. **User Communication**
   - Update users if service is affected
   - Provide estimated resolution time
   - Post updates as needed

## Prevention

### Best Practices

1. **Staging Environment**
   - Always test changes in staging first
   - Use production-like data for testing
   - Run full test suite before production deployment

2. **Gradual Rollouts**
   - Use feature flags for new features
   - Deploy to a subset of users first
   - Monitor metrics and user feedback

3. **Monitoring**
   - Set up alerts for critical metrics
   - Monitor error rates and response times
   - Use health checks and smoke tests

4. **Backup Strategy**
   - Regular database backups
   - Test backup restoration procedures
   - Document recovery procedures

## Recovery Time Objectives (RTO)

- **Critical Issues**: 15 minutes
- **Major Issues**: 1 hour
- **Minor Issues**: 4 hours

## Recovery Point Objectives (RPO)

- **Data Loss**: 0 (no data loss acceptable)
- **Service Availability**: 99.9% uptime target