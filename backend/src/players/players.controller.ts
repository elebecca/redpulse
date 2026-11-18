import { Controller, Get, Query } from '@nestjs/common';
import { PlayersService } from './players.service.js';

@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get('summary')
  getSummary() {
    return this.playersService.getSummary();
  }

  @Get('trend')
  getTrend(@Query('metric') metric: string) {
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 60);

    if (metric === 'activePlayers') {
      return this.playersService.getDailyActivePlayers(startDate, endDate);
    }

    if (metric === 'registrations') {
      return this.playersService.getDailyRegistrations(startDate, endDate);
    }

    if (metric === 'firstTimeDepositors') {
      return this.playersService.getDailyFirstTimeDepositors(
        startDate,
        endDate,
      );
    }

    return [];
  }
}
