import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService, private readonly jwtService: JwtService) {}

  async register(email: string, password: string, displayName?: string) {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.usersService.createLocalUser({ email, passwordHash, displayName });
    return this.createToken(user._id.toString(), user.email, user.roles);
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return this.createToken(user._id.toString(), user.email, user.roles);
  }

  createToken(userId: string, email: string, roles: string[]) {
    const payload = { sub: userId, email, roles };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}

