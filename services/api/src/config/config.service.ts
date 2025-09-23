import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  get mongoUri(): string {
    return process.env.MONGODB_URI || 'mongodb://localhost:27017/halobuzz';
  }

  get jwtSecret(): string {
    return process.env.JWT_SECRET || 'dev_secret_change_me';
  }

  get jwtExpiresIn(): string {
    return process.env.JWT_EXPIRES_IN || '7d';
  }
}

