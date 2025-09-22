import { Controller, Get } from '@nestjs/common';

@Controller('admin')
export class AdminController {
  @Get('overview')
  overview() {
    return {
      earningsToday: 0,
      activeHosts: 0,
      suspiciousReports: 0,
    };
  }
}

