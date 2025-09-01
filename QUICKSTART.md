# HaloBuzz Quick Start Guide

Get the HaloBuzz platform up and running in minutes!

## 🚀 Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm 9+** - Comes with Node.js
- **Git** - [Download here](https://git-scm.com/)
- **MongoDB** - [Install locally](https://docs.mongodb.com/manual/installation/) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- **Redis** - [Install locally](https://redis.io/download) or use [Redis Cloud](https://redis.com/)

## ⚡ Quick Setup (5 minutes)

### 1. Clone the Repository

```bash
git clone https://github.com/halobuzz/halobuzz-platform.git
cd halobuzz-platform
```

### 2. Run the Setup Script

```bash
# Make the script executable
chmod +x setup.sh

# Run the setup script
./setup.sh
```

The setup script will:
- ✅ Check prerequisites
- ✅ Install all dependencies
- ✅ Create environment files
- ✅ Set up directories
- ✅ Build projects
- ✅ Start databases
- ✅ Create startup scripts

### 3. Configure Environment Variables

Update the following files with your API keys:

**Backend (`backend/.env`):**
```env
# Required for basic functionality
MONGODB_URI=mongodb://localhost:27017/halobuzz
JWT_SECRET=your-super-secret-jwt-key-here
AGORA_APP_ID=your-agora-app-id
AGORA_APP_CERTIFICATE=your-agora-app-certificate

# Optional but recommended
OPENAI_API_KEY=your-openai-api-key
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
```

**Mobile (`mobile/.env`):**
```env
API_BASE_URL=http://localhost:3000/api/v1
SOCKET_URL=http://localhost:3000
AGORA_APP_ID=your-agora-app-id
```

### 4. Start Development Environment

```bash
# Start all services
./start-dev.sh
```

This will start:
- Backend API on http://localhost:3000
- AI Engine on http://localhost:3001
- Mobile app (Expo) - QR code will be displayed

### 5. Test the Platform

1. **Backend API**: Visit http://localhost:3000/health
2. **Mobile App**: Scan QR code with Expo Go app
3. **AI Engine**: Visit http://localhost:3001/health

## 🎯 Essential API Keys

### Required for Basic Functionality

| Service | Purpose | Get API Key |
|---------|---------|-------------|
| **Agora** | Live streaming | [Sign up here](https://www.agora.io/) |
| **MongoDB Atlas** | Database | [Sign up here](https://www.mongodb.com/cloud/atlas) |
| **Redis Cloud** | Caching | [Sign up here](https://redis.com/) |

### Recommended for Full Features

| Service | Purpose | Get API Key |
|---------|---------|-------------|
| **OpenAI** | AI features | [Sign up here](https://openai.com/) |
| **AWS S3** | File storage | [Sign up here](https://aws.amazon.com/) |
| **Stripe** | Payments | [Sign up here](https://stripe.com/) |
| **eSewa** | Nepal payments | [Sign up here](https://esewa.com.np/) |
| **Khalti** | Nepal payments | [Sign up here](https://khalti.com/) |
| **Twilio** | SMS | [Sign up here](https://www.twilio.com/) |
| **Firebase** | Push notifications | [Sign up here](https://firebase.google.com/) |

## 📱 Mobile App Development

### Using Expo Go (Recommended for testing)

1. Install [Expo Go](https://expo.dev/client) on your phone
2. Scan the QR code displayed when running `./start-dev.sh`
3. The app will load on your device

### Using Simulators

```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android
```

## 🔧 Development Workflow

### Backend Development

```bash
cd backend
npm run dev  # Start with hot reload
```

### Mobile Development

```bash
cd mobile
npm start    # Start Expo development server
```

### AI Engine Development

```bash
cd ai-engine
npm run dev  # Start with hot reload
```

## 📊 Monitoring & Debugging

### Backend Logs

```bash
# View backend logs
tail -f backend/logs/app.log

# View error logs
tail -f backend/logs/error.log
```

### Database Access

```bash
# MongoDB shell
mongosh mongodb://localhost:27017/halobuzz

# Redis CLI
redis-cli
```

### Health Checks

- Backend: http://localhost:3000/health
- AI Engine: http://localhost:3001/health
- Database: Check MongoDB connection
- Cache: Check Redis connection

## 🐛 Common Issues & Solutions

### Port Already in Use

```bash
# Find process using port
lsof -i :3000
lsof -i :3001

# Kill process
kill -9 <PID>
```

### MongoDB Connection Issues

```bash
# Start MongoDB locally
mongod --dbpath /tmp/mongodb

# Or update connection string in .env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/halobuzz
```

### Redis Connection Issues

```bash
# Start Redis locally
redis-server

# Or update connection string in .env
REDIS_URL=redis://username:password@redis-cloud-host:port
```

### Expo Issues

```bash
# Clear Expo cache
expo r -c

# Reset Metro bundler
npx react-native start --reset-cache
```

## 🚀 Production Deployment

### Build for Production

```bash
# Build all projects
npm run build

# Start production environment
./start-prod.sh
```

### Docker Deployment

```bash
# Build Docker images
docker-compose build

# Start services
docker-compose up -d
```

## 📚 Next Steps

1. **Read the Documentation**:
   - [Architecture Guide](docs/ARCHITECTURE.md)
   - [API Documentation](docs/API.md)
   - [Mobile App Guide](docs/MOBILE.md)

2. **Explore the Codebase**:
   - Backend: `backend/src/`
   - Mobile: `mobile/src/`
   - AI Engine: `ai-engine/src/`

3. **Join the Community**:
   - [Discord](https://discord.gg/halobuzz)
   - [GitHub Issues](https://github.com/halobuzz/halobuzz-platform/issues)

## 🆘 Getting Help

- **Documentation**: Check the `docs/` folder
- **Issues**: Create a GitHub issue
- **Discord**: Join our community
- **Email**: support@halobuzz.com

## 🎉 You're Ready!

Your HaloBuzz platform is now running! Start building amazing live streaming experiences for Nepal and beyond.

---

**Happy Coding! 🚀**
