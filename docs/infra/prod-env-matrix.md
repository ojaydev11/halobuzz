# Production Environment Variables Matrix

This document provides a comprehensive overview of all environment variables required for production deployment across all HaloBuzz services.

## Backend Service (Railway)

| Variable | Required | Default | Description | Notes |
|----------|----------|---------|-------------|-------|
| `NODE_ENV` | ✅ | `production` | Node.js environment | Must be `production` |
| `PORT` | ✅ | `5010` | Server port | Railway will override with `$PORT` |
| `MONGODB_URI` | ✅ | - | MongoDB connection string | Atlas cluster URI |
| `REDIS_URL` | ✅ | - | Redis connection string | Railway Redis addon |
| `JWT_SECRET` | ✅ | - | JWT signing secret | 64+ characters, cryptographically secure |
| `ADMIN_EMAILS` | ✅ | - | Admin user emails | Comma-separated list |
| `AI_ENGINE_URL` | ✅ | - | AI Engine service URL | `https://<ai-service>.railway.app` |
| `AI_ENGINE_SECRET` | ✅ | - | AI Engine auth secret | Same as AI_ENGINE_SECRET in AI service |
| `CORS_ORIGIN` | ✅ | - | Allowed CORS origins | Comma-separated, include Vercel admin URL |
| `TZ` | ❌ | `UTC` | Timezone | Recommended: `Australia/Sydney` |
| `S3_BUCKET` | ❌ | - | AWS S3 bucket name | For file uploads |
| `S3_REGION` | ❌ | - | AWS S3 region | e.g., `ap-southeast-2` |
| `S3_ACCESS_KEY` | ❌ | - | AWS S3 access key | IAM user with S3 permissions |
| `S3_SECRET_KEY` | ❌ | - | AWS S3 secret key | IAM user with S3 permissions |
| `AGORA_APP_ID` | ❌ | - | Agora.io app ID | For live streaming |
| `AGORA_APP_CERT` | ❌ | - | Agora.io app certificate | For live streaming |

## AI Engine Service (Railway)

| Variable | Required | Default | Description | Notes |
|----------|----------|---------|-------------|-------|
| `NODE_ENV` | ✅ | `production` | Node.js environment | Must be `production` |
| `PORT` | ✅ | `5020` | Server port | Railway will override with `$PORT` |
| `AI_ENGINE_SECRET` | ✅ | - | AI Engine auth secret | Same as backend AI_ENGINE_SECRET |
| `LOG_LEVEL` | ❌ | `info` | Logging level | `debug`, `info`, `warn`, `error` |

## Admin Dashboard (Vercel)

| Variable | Required | Default | Description | Notes |
|----------|----------|---------|-------------|-------|
| `NEXT_PUBLIC_API_BASE` | ✅ | - | Backend API base URL | `https://<backend>.railway.app/api/v1` |
| `ADMIN_EMAILS` | ✅ | - | Admin user emails | Comma-separated list |
| `NODE_VERSION` | ❌ | `20` | Node.js version | Vercel build environment |

## Mobile App (Expo)

| Variable | Required | Default | Description | Notes |
|----------|----------|---------|-------------|-------|
| `EXPO_PUBLIC_API_BASE` | ✅ | - | Backend API base URL | `https://<backend>.railway.app/api/v1` |
| `EXPO_PUBLIC_AI_URL` | ✅ | - | AI Engine URL | `https://<ai-service>.railway.app` |
| `EXPO_PUBLIC_AGORA_APP_ID` | ❌ | - | Agora.io app ID | For live streaming |

## GitHub Actions Secrets

| Secret | Required | Description | Used By |
|--------|----------|-------------|---------|
| `RAILWAY_TOKEN` | ✅ | Railway API token | Backend & AI deployment |
| `BACKEND_URL` | ✅ | Backend service URL | Health checks & smoke tests |
| `AI_URL` | ✅ | AI Engine service URL | Health checks & smoke tests |
| `AI_ENGINE_SECRET` | ✅ | AI Engine auth secret | Smoke tests |
| `VERCEL_TOKEN` | ❌ | Vercel API token | Admin deployment |
| `VERCEL_ORG_ID` | ❌ | Vercel organization ID | Admin deployment |
| `VERCEL_PROJECT_ID` | ❌ | Vercel project ID | Admin deployment |

## Environment Setup Checklist

### Railway Services
1. Create Railway project
2. Add MongoDB addon
3. Add Redis addon
4. Create backend service
5. Create AI engine service
6. Set environment variables for each service
7. Deploy services

### Vercel Project
1. Connect GitHub repository
2. Set build command: `pnpm install --frozen-lockfile && pnpm build`
3. Set output directory: `.next`
4. Set environment variables
5. Deploy

### GitHub Secrets
1. Go to repository Settings → Secrets and variables → Actions
2. Add all required secrets listed above
3. Verify secrets are properly set

## Security Notes

- All secrets should be at least 64 characters long
- Use cryptographically secure random generators for secrets
- Never commit real secrets to version control
- Rotate secrets regularly
- Use different secrets for different environments
- Monitor secret usage and access

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure `CORS_ORIGIN` includes the exact Vercel admin URL
2. **AI Engine 401**: Verify `AI_ENGINE_SECRET` matches between backend and AI service
3. **Database Connection**: Check MongoDB URI format and network access
4. **Redis Connection**: Verify Redis URL and network access
5. **Build Failures**: Ensure Node.js version is 20 and pnpm is available

### Health Check Endpoints

- Backend: `GET /healthz`
- AI Engine: `GET /healthz` (requires `x-ai-secret` header)
- Admin: Next.js build success

### Monitoring

- Railway provides built-in monitoring and logs
- Vercel provides deployment status and analytics
- GitHub Actions provides CI/CD pipeline status
- Use smoke tests to verify end-to-end functionality