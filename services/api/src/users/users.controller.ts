import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get(':email')
  get(@Param('email') email: string) {
    return this.users.findByEmail(email);
  }

  @Post('profile')
  profile(@Body() body: { email: string }) {
    return this.users.findByEmail(body.email);
  }
}

