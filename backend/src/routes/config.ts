import express from 'express';
import { featureFlags } from '@/config/flags';
import { riskControlsService } from '@/services/RiskControlsService';
import { User } from '@/models/User';
import { logger } from '@/config/logger';

const router = express.Router();

// Get public configuration for mobile/frontend apps
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    let userCountry = 'US'; // Default
    
    if (userId) {
      const user = await User.findById(userId).select('country');
      userCountry = user?.country || 'US';
    }

    // Get feature flags that should be exposed to clients
    const publicFlags = {
      gamesEnabled: await featureFlags.isGamesEnabled(),
      paymentsEnabled: await featureFlags.isPaymentsEnabled(),
      maintenanceMode: await featureFlags.isMaintenanceMode(),
      registrationPaused: await featureFlags.isRegistrationPaused(),
      ageVerificationRequired: await featureFlags.isAgeVerificationRequired(),
      kycRequiredForHosts: await featureFlags.isKycRequiredForHosts()
    };

    // Check country-specific games availability
    const gamesEnabledForCountry = await riskControlsService.isGamesEnabledForCountry(userCountry);
    publicFlags.gamesEnabled = publicFlags.gamesEnabled && gamesEnabledForCountry;

    // Get user session status if authenticated
    let sessionStatus = null;
    if (userId) {
      sessionStatus = await riskControlsService.getSessionStatus(userId);
    }

    const config = {
      version: '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      features: publicFlags,
      country: userCountry,
      sessionStatus,
      supportedCountries: ['US', 'NP', 'IN', 'UK', 'AU'],
      supportedLanguages: ['en', 'ne'],
      supportedCurrencies: ['USD', 'NPR', 'INR'],
      limits: {
        maxUploadSize: 10 * 1024 * 1024, // 10MB
        maxVideoLength: 300, // 5 minutes
        maxStreamDuration: 14400 // 4 hours
      }
    };

    // Add maintenance message if in maintenance mode
    if (publicFlags.maintenanceMode) {
      config.maintenanceMessage = 'HaloBuzz is currently under maintenance. Please check back soon.';
    }

    // Add registration pause message
    if (publicFlags.registrationPaused) {
      config.registrationMessage = 'New user registrations are temporarily paused.';
    }

    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    logger.error('Error fetching app configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch configuration'
    });
  }
});

// Get country-specific configuration
router.get('/country/:countryCode', async (req, res) => {
  try {
    const { countryCode } = req.params;
    
    // Validate country code
    if (!/^[A-Z]{2}$/.test(countryCode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid country code format'
      });
    }

    const gamesEnabled = await riskControlsService.isGamesEnabledForCountry(countryCode);
    
    const countryConfig = {
      country: countryCode,
      gamesEnabled,
      features: {
        liveStreaming: true,
        shortVideos: true,
        virtualGifts: true,
        games: gamesEnabled,
        payments: await featureFlags.isPaymentsEnabled()
      },
      compliance: {
        ageVerificationRequired: countryCode === 'NP' || await featureFlags.isAgeVerificationRequired(),
        kycRequired: countryCode === 'NP' || await featureFlags.isKycRequiredForHosts(),
        responsibleGaming: gamesEnabled
      }
    };

    res.json({
      success: true,
      data: countryConfig
    });

  } catch (error) {
    logger.error('Error fetching country configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch country configuration'
    });
  }
});

// Health check for configuration service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'config',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;
