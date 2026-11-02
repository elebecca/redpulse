import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { KeycloakAuthGuard } from '../auth/keycloak-auth.guard.js';

//All routes in this class start with /dashboard
@Controller('dashboard')
export class DashboardController {
  // NestJS injects an instance of DashboardService here.
  // "private readonly" means this service is available inside this class
  // and should not be reassigned.
  constructor(private readonly dashboardService: DashboardService) {}
  @UseGuards(KeycloakAuthGuard)
  // This creates a GET endpoint:
  // GET /dashboard/summary
  @Get('summary')
  getSummary() {
    return this.dashboardService.getSummary();
  }
}
