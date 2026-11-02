import { Controller, Get, Req } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import type { Request } from 'express';

//All routes in this class start with /dashboard
@Controller('dashboard')
export class DashboardController {
  // NestJS injects an instance of DashboardService here.
  // "private readonly" means this service is available inside this class
  // and should not be reassigned.
  constructor(private readonly dashboardService: DashboardService) {}

  // This creates a GET endpoint:
  // GET /dashboard/summary
  @Get('summary')
  getSummary(@Req() req: Request) {
    return this.dashboardService.getSummary();
  }
}
