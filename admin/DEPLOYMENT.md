# HaloBuzz Admin Panel - Deployment Guide

## 🚀 Quick Deploy to Vercel

### Prerequisites
- Vercel account
- GitHub repository
- MongoDB database (MongoDB Atlas recommended)

### 1. One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/halobuzz-admin&env=MONGODB_URI,JWT_SECRET,NEXTAUTH_SECRET,API_BASE_URL)

### 2. Manual Deployment

#### Step 1: Prepare Environment Variables
Set these environment variables in Vercel dashboard:

```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/halobuzz-admin

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NEXTAUTH_SECRET=nextauth-secret-key-change-this-in-production
NEXTAUTH_URL=https://your-admin-domain.vercel.app

# API Configuration
API_BASE_URL=https://halo-api-production.up.railway.app/api/v1

# Security
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=24h
NODE_ENV=production
```

#### Step 2: Deploy to Vercel
1. Connect your GitHub repository to Vercel
2. Select the `admin` folder as the root directory
3. Vercel will automatically detect Next.js and configure build settings
4. Add environment variables in the Vercel dashboard
5. Deploy!

### 3. Local Development Setup

```bash
# Install dependencies
cd admin
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your configuration

# Run development server
npm run dev
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `JWT_SECRET` | Secret key for JWT tokens | Yes | - |
| `NEXTAUTH_SECRET` | NextAuth secret | Yes | - |
| `NEXTAUTH_URL` | Your domain URL | Yes | - |
| `API_BASE_URL` | Backend API URL | Yes | - |
| `BCRYPT_ROUNDS` | Password hashing rounds | No | 12 |
| `SESSION_TIMEOUT` | Session timeout | No | 24h |

### Default Admin Accounts

The system creates these default accounts on first run:

| Role | Username | Password | Access Level |
|------|----------|----------|--------------|
| Super Admin | `superadmin` | `HaloBuzz2024!` | Full system access |
| Admin | `admin` | `Admin123!` | High-level administration |
| Moderator | `moderator` | `Mod123!` | Content moderation |
| Support | `support` | `Support123!` | Customer support |

**⚠️ IMPORTANT:** Change these passwords immediately in production!

## 🏗️ Architecture

### Tech Stack
- **Framework:** Next.js 14
- **Styling:** Tailwind CSS
- **Authentication:** Custom JWT + Cookie-based sessions
- **Database:** MongoDB (with in-memory fallback for development)
- **UI Components:** Headless UI + Heroicons
- **Charts:** Recharts
- **Deployment:** Vercel

### Security Features
- 🔒 JWT-based authentication with HttpOnly cookies
- 🛡️ Role-based access control (RBAC)
- 🔐 Password hashing with bcrypt
- 🚫 CSRF protection
- 🔍 Content Security Policy headers
- 🌐 HTTPS enforcement
- 🚪 Secure session management

### Database Schema

The system uses a flexible schema that supports:
- Admin user management with roles
- Session tracking and security
- Audit logging capabilities
- Scalable permission system

## 🔐 Security Considerations

### Production Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Enable MongoDB authentication
- [ ] Set up MongoDB IP whitelist
- [ ] Configure proper CORS settings
- [ ] Enable rate limiting
- [ ] Set up monitoring and alerting
- [ ] Regular security updates
- [ ] Enable 2FA for admin accounts (future enhancement)

### Environment Security
- Never commit `.env.local` to version control
- Use Vercel environment variables for production
- Rotate JWT secrets regularly
- Monitor for unauthorized access attempts

## 📊 Features

### Admin Panel Capabilities
- **Dashboard**: Real-time metrics and system status
- **User Management**: Full CRUD operations with role assignment
- **Content Moderation**: Review and manage user-generated content
- **Analytics**: User behavior, heatmaps, and performance metrics
- **AI Monitoring**: AI system performance and intelligence tracking
- **System Health**: Alerts, monitoring, and problem detection
- **Promotions**: Campaign management and tracking
- **Role Management**: Granular permission system

### Role-Based Access Control
- **Super Admin (Level 100)**: Full system access
- **Admin (Level 80)**: High-level administration
- **Moderator (Level 50)**: Content moderation focus
- **Support (Level 30)**: Customer support capabilities
- **Viewer (Level 10)**: Read-only access

## 🚨 Troubleshooting

### Common Issues

**1. Authentication not working**
- Check JWT_SECRET is set
- Verify NEXTAUTH_URL matches your domain
- Clear browser cookies and try again

**2. Database connection errors**
- Verify MONGODB_URI is correct
- Check MongoDB Atlas IP whitelist
- Ensure database user has proper permissions

**3. Build failures on Vercel**
- Check all environment variables are set
- Verify package.json scripts are correct
- Review build logs for specific errors

**4. Permission denied errors**
- Check user roles are assigned correctly
- Verify RBAC configuration
- Clear auth cookies and re-login

### Support

For deployment issues:
1. Check the Vercel dashboard logs
2. Review this documentation
3. Test locally first
4. Contact support if needed

## 🔄 Updates and Maintenance

### Regular Maintenance
- Monitor user activity and clean up inactive accounts
- Review and update permissions regularly
- Check for security updates
- Backup database regularly
- Monitor system performance metrics

### Updating the Admin Panel
1. Pull latest changes
2. Update dependencies: `npm update`
3. Run tests: `npm run test` (if available)
4. Deploy to staging first
5. Deploy to production after testing

---

## 📞 Need Help?

- 📚 Check the [documentation](../README.md)
- 🐛 Report issues on GitHub
- 💬 Contact the development team

**Happy deploying! 🎉**